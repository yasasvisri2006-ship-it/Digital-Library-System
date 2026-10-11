import { useEffect, useState } from 'react';
import { Layers3 } from 'lucide-react';
import { getEducationalMaterials } from '../services/educationalMaterials';
import { EducationalMaterialGrid } from './EducationalMaterials';

export default function EducationalCurriculum({ section = 'subjects', title = 'Suggested Data Science curriculum' }) {
  const [subjects, setSubjects] = useState([]);
  const [studyMaterials, setStudyMaterials] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      getEducationalMaterials(section, controller.signal),
      getEducationalMaterials('study-materials', controller.signal),
    ])
      .then(([catalog, materials]) => {
        setSubjects(catalog);
        setStudyMaterials(materials);
      })
      .catch((requestError) => {
        if (requestError.name !== 'CanceledError') {
          setError(requestError.response?.data?.message || 'Curriculum resources could not be loaded.');
        }
      });
    return () => controller.abort();
  }, [section]);

  const linkedSubjects = subjects.map((subject) => {
    const notes = studyMaterials.find((material) => material.subjectName === subject.subjectName);
    return notes ? { ...subject, fileUrl: notes.fileUrl, fileName: notes.fileName } : subject;
  });

  return (
    <section className="education-curriculum">
      <header className="learning-page-heading">
        <span className="learning-title-icon"><Layers3 size={20} /></span>
        <div><span className="section-eyebrow">{subjects.length} SUBJECTS · SUGGESTED SEQUENCE</span><h2>{title}</h2><p>Semester labels are a study suggestion, not an official university syllabus. Each subject includes chapter notes and a downloadable original study guide.</p></div>
      </header>
      {error && <p className="academic-message is-error" role="alert">{error}</p>}
      {subjects.length > 0 && <EducationalMaterialGrid materials={linkedSubjects} />}
    </section>
  );
}
