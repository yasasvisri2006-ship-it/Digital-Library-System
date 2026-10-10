import { useEffect, useState } from 'react';
import { ArrowUpRight, Award, BriefcaseBusiness, ExternalLink, FileText, GraduationCap, Sparkles, Wrench } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';

function apiOrigin() { return (api.defaults.baseURL || '').replace(/\/api\/?$/, ''); }

export default function PublicPortfolioPage() {
  const { slug } = useParams();
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    api.get(`/public/portfolio/${slug}`, { signal: controller.signal })
      .then(({ data }) => setPortfolio(data.data.portfolio))
      .catch((requestError) => {
        if (requestError.name !== 'CanceledError') setError(requestError.response?.status === 404 ? 'This portfolio is unavailable or has not been published.' : requestError.response?.data?.message || 'Portfolio could not be loaded.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [slug]);

  if (loading) return <main className="public-portfolio-loading">Loading portfolio...</main>;
  if (error || !portfolio) return <main className="public-portfolio-missing"><span><FileText size={24} /></span><h1>Portfolio unavailable</h1><p>{error || 'This portfolio is not public.'}</p><Link to="/dashboard">MBU Digital Library</Link></main>;

  const { resume, projects, certificates } = portfolio;
  const hasSocial = resume.social && (resume.social.linkedInUrl || resume.social.githubUrl || resume.social.portfolioUrl);

  return (
    <main className="public-portfolio">
      <header className="public-portfolio-top"><Link to="/dashboard" className="public-brand">MBU <span>Digital Library</span></Link><span>Student Portfolio</span></header>
      <article className="public-resume-sheet">
        <header className="public-resume-header">
          <span className="public-profile-monogram">{resume.displayName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>
          <div><span className="section-eyebrow">ACADEMIC PORTFOLIO</span><h1>{resume.displayName}</h1>{resume.contact && <p className="public-contact-line">{[resume.contact.email, resume.contact.phone, resume.contact.location].filter(Boolean).join(' · ')}</p>}</div>
        </header>
        {resume.summary && <section className="public-resume-section"><h2><Sparkles size={16} /> Professional Summary</h2><p>{resume.summary}</p></section>}
        {resume.education.length > 0 && <section className="public-resume-section"><h2><GraduationCap size={16} /> Education</h2><div className="public-entry-list">{resume.education.map((entry, index) => <article key={`education-${index}`}><div><h3>{entry.qualification || 'Education'}{entry.field ? ` · ${entry.field}` : ''}</h3><p>{entry.institution}</p>{entry.details && <p>{entry.details}</p>}</div><span>{entry.startYear || ''}{entry.endYear ? ` – ${entry.endYear}` : ''}</span></article>)}</div></section>}
        {resume.skills.length > 0 && <section className="public-resume-section"><h2><Wrench size={16} /> Technical Skills</h2><div className="public-skill-list">{resume.skills.map((skill) => <span key={skill}>{skill}</span>)}</div></section>}
        {projects.length > 0 && <section className="public-resume-section"><h2><BriefcaseBusiness size={16} /> Selected Projects</h2><div className="public-project-list">{projects.map((project) => <article key={project.id}>
          <div className="public-project-heading"><h3>{project.title}</h3><span>{project.status.replaceAll('_', ' ').toLowerCase()}</span></div>
          {project.description && <p>{project.description}</p>}
          {project.techStack.length > 0 && <p className="public-project-tech"><strong>Technologies:</strong> {project.techStack.join(', ')}</p>}
          {project.documentation && <details><summary>Project documentation</summary><p>{project.documentation}</p></details>}
          {project.screenshots.length > 0 && <div className="public-project-screenshots">{project.screenshots.map((screenshot) => <img key={screenshot.id} src={`${apiOrigin()}/api${screenshot.url}`} alt={`${project.title} project screenshot`} />)}</div>}
          <div className="public-project-links">{project.repositoryUrl && <a href={project.repositoryUrl} target="_blank" rel="noreferrer">GitHub repository <ArrowUpRight size={14} /></a>}{project.demoUrl && <a href={project.demoUrl} target="_blank" rel="noreferrer">Live deployment <ArrowUpRight size={14} /></a>}</div>
        </article>)}</div></section>}
        {resume.internships.length > 0 && <section className="public-resume-section"><h2><BriefcaseBusiness size={16} /> Experience</h2><div className="public-entry-list">{resume.internships.map((entry, index) => <article key={`internship-${index}`}><div><h3>{entry.role || 'Experience'}{entry.organization ? ` · ${entry.organization}` : ''}</h3>{entry.description && <p>{entry.description}</p>}</div><span>{entry.startDate || ''}{entry.endDate ? ` – ${entry.endDate}` : ''}</span></article>)}</div></section>}
        {certificates.length > 0 && <section className="public-resume-section"><h2><Award size={16} /> Certifications</h2><div className="public-certificate-list">{certificates.map((certificate) => <article key={certificate.id}><div><h3>{certificate.title}</h3><p>{certificate.issuer || 'Issuer not specified'}{certificate.issuedAt ? ` · ${new Date(certificate.issuedAt).toLocaleDateString()}` : ''}</p></div>{certificate.credentialUrl && <a href={certificate.credentialUrl} target="_blank" rel="noreferrer">Credential <ExternalLink size={13} /></a>}{certificate.fileUrl && <a href={`${apiOrigin()}/api${certificate.fileUrl}`} target="_blank" rel="noreferrer">Certificate file <ExternalLink size={13} /></a>}</article>)}</div></section>}
        {resume.achievements.length > 0 && <section className="public-resume-section"><h2><Award size={16} /> Achievements</h2><ul>{resume.achievements.map((achievement, index) => <li key={`achievement-${index}`}>{achievement}</li>)}</ul></section>}
        {hasSocial && <section className="public-resume-section"><h2><BriefcaseBusiness size={16} /> Professional Links</h2><div className="public-social-links">{resume.social.linkedInUrl && <a href={resume.social.linkedInUrl} target="_blank" rel="noreferrer">LinkedIn <ArrowUpRight size={13} /></a>}{resume.social.githubUrl && <a href={resume.social.githubUrl} target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={13} /></a>}{resume.social.portfolioUrl && <a href={resume.social.portfolioUrl} target="_blank" rel="noreferrer">Portfolio <ArrowUpRight size={13} /></a>}</div></section>}
      </article>
      <footer className="public-portfolio-footer">Shared by the portfolio owner · <a href={`${window.location.origin}/dashboard`}>MBU Digital Library</a></footer>
    </main>
  );
}
