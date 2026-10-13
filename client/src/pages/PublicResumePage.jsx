const resumeUrl = '/resumes/Peta_Yasasvisri_Resume.pdf';

export default function PublicResumePage() {
  return (
    <main className="resume-pdf-page">
      <header className="resume-pdf-header">
        <div>
          <span className="section-eyebrow">DATA SCIENCE DIGITAL LIBRARY</span>
          <h1>Peta Yasasvisri — Resume</h1>
        </div>
        <a href={resumeUrl} target="_blank" rel="noopener noreferrer">
          Open PDF
        </a>
        <a href={resumeUrl} download>
          Download PDF
        </a>
      </header>
      <iframe
        className="resume-pdf-viewer"
        src={`${resumeUrl}#view=FitH`}
        title="Peta Yasasvisri resume"
      />
    </main>
  );
}
