"""
When a candidate lands on a pipeline stage, ensure interview_assignments exist
for every interview_plan tied to that stage (idempotent).

If the stage is an interview column but no InterviewPlan was configured in the job
editor, we create a default plan so assignments (and the Interviews dashboard) stay
in sync with the pipeline.

Also used by backfill jobs to repair missing rows after deploys or data fixes.
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.helpers.logger import get_logger
from app.models.application import Application
from app.models.interview_assignment import InterviewAssignment
from app.models.interview_plan import InterviewPlan
from app.models.pipeline_stage import PipelineStage

logger = get_logger(__name__)


def _stage_should_auto_interview_plan(stage: PipelineStage) -> bool:
    """True when this Kanban column should spawn interview rounds without manual job setup."""
    st = (stage.stage_type or "").strip().lower()
    if st == "interview":
        return True
    # Common case: column titled "Interview" but stage_type left blank in the job editor
    if not st:
        name = (stage.name or "").strip().lower()
        if name in ("interview", "interviews"):
            return True
    return False


def _next_plan_position(db: Session, account_id: int, job_id: int) -> int:
    m = db.scalar(
        select(func.coalesce(func.max(InterviewPlan.position), 0)).where(
            InterviewPlan.account_id == account_id,
            InterviewPlan.job_id == job_id,
        )
    )
    return int(m or 0) + 1


def _ensure_interview_plans_for_stage(
    db: Session,
    account_id: int,
    application: Application,
    pipeline_stage_id: int,
) -> list[InterviewPlan]:
    """Return all interview plans for this stage, creating a default plan if needed."""
    stmt = (
        select(InterviewPlan)
        .where(
            InterviewPlan.account_id == account_id,
            InterviewPlan.job_id == application.job_id,
            InterviewPlan.pipeline_stage_id == pipeline_stage_id,
        )
        .order_by(InterviewPlan.position.asc(), InterviewPlan.id.asc())
    )
    plans = list(db.execute(stmt).scalars().all())
    if plans:
        return plans

    stage = PipelineStage.find_by(
        db,
        id=pipeline_stage_id,
        account_id=account_id,
        job_id=application.job_id,
    )
    if not stage or not _stage_should_auto_interview_plan(stage):
        return []

    now = datetime.now(timezone.utc)
    raw_name = (stage.name or "").strip() or "Interview"
    name = raw_name[:100]
    plan = InterviewPlan(
        account_id=account_id,
        job_id=application.job_id,
        name=name,
        pipeline_stage_id=pipeline_stage_id,
        position=_next_plan_position(db, account_id, application.job_id),
        duration_minutes=None,
        interview_format=None,
        created_at=now,
        updated_at=now,
    )
    db.add(plan)
    db.flush()

    logger.info(
        "interview_sync — auto-created default interview_plan for interview stage",
        extra={
            "pipeline_stage_id": pipeline_stage_id,
            "interview_plan_id": plan.id,
            "job_id": application.job_id,
            "application_id": application.id,
        },
    )
    return [plan]


def _create_missing_assignments_for_stage(
    db: Session,
    account_id: int,
    application: Application,
    pipeline_stage_id: int,
) -> int:
    """Create InterviewAssignment rows for each plan on this stage; return count created."""
    plans = _ensure_interview_plans_for_stage(db, account_id, application, pipeline_stage_id)
    if not plans:
        return 0

    now = datetime.now(timezone.utc)
    created = 0
    for plan in plans:
        existing = InterviewAssignment.find_by(
            db,
            application_id=application.id,
            interview_plan_id=plan.id,
        )
        if existing:
            continue
        db.add(
            InterviewAssignment(
                account_id=account_id,
                application_id=application.id,
                interview_plan_id=plan.id,
                interviewer_id=None,
                status="pending",
                created_at=now,
                updated_at=now,
            )
        )
        created += 1
    return created


def sync_interview_assignments_for_pipeline_move(
    db: Session,
    account_id: int,
    application: Application,
    old_pipeline_stage_id: int | None,
    new_pipeline_stage_id: int | None,
) -> None:
    if new_pipeline_stage_id == old_pipeline_stage_id:
        return
    if new_pipeline_stage_id is None:
        return

    created = _create_missing_assignments_for_stage(db, account_id, application, new_pipeline_stage_id)
    if created:
        db.commit()
        logger.info(
            "interview_sync — created assignments",
            extra={
                "application_id": application.id,
                "pipeline_stage_id": new_pipeline_stage_id,
                "count": created,
            },
        )


def ensure_interview_assignments_for_application(
    db: Session,
    account_id: int,
    application_id: int,
) -> int:
    """
    Idempotent repair: ensure rows exist for the application's *current* pipeline stage.
    Use when backfilling or after migrations (same-stage duplicate check is skipped inside).
    """
    app = Application.find_by(db, id=application_id, account_id=account_id)
    if not app or app.pipeline_stage_id is None:
        return 0
    created = _create_missing_assignments_for_stage(db, account_id, app, app.pipeline_stage_id)
    if created:
        db.commit()
        logger.info(
            "interview_sync — ensure current stage",
            extra={"application_id": application_id, "count": created},
        )
    return created
