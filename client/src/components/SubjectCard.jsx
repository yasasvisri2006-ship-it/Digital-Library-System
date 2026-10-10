import { BookOpen, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SubjectCard({ subject, onEdit, onDelete, busy }) {
  return (
    <article className="subject-card">
      <div className="subject-card-top">
        <span className="subject-card-icon"><BookOpen size={19} /></span>
        <div className="subject-card-menu">
          <button type="button" aria-label={`Edit ${subject.name}`} onClick={() => onEdit(subject)} disabled={busy}>
            <Pencil size={14} />
          </button>
          <button type="button" aria-label={`Delete ${subject.name}`} onClick={() => onDelete(subject)} disabled={busy}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <Link to={`/my-subjects/${subject.id}`} className="subject-card-content">
        <span className="subject-card-code">{subject.code || 'PERSONAL SUBJECT'}</span>
        <h3>{subject.name}</h3>
        <p>{subject.description || 'Add your verified syllabus, lecture notes, assignments, and reference materials.'}</p>
      </Link>
      <div className="subject-card-meta">
        <span>{subject.resourceCount} {subject.resourceCount === 1 ? 'resource' : 'resources'}</span>
        <span>{subject.semester || 'Semester not set'}</span>
      </div>
      <div className="subject-progress">
        <div><span>Resources reviewed</span><strong>{subject.progressPercent}%</strong></div>
        <span className="subject-progress-track"><span style={{ width: `${subject.progressPercent}%` }} /></span>
        <small>{subject.reviewedResourceCount} of {subject.resourceCount} reviewed</small>
      </div>
      <Link to={`/my-subjects/${subject.id}`} className="subject-card-open">
        Open subject <MoreHorizontal size={15} />
      </Link>
    </article>
  );
}
