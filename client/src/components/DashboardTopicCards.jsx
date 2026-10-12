import { ArrowUpRight, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';

const topics = [
  {
    title: 'Python Programming',
    description: 'Build a strong foundation in Python syntax, functions, and problem solving.',
    image: '/images/data-science-topics/python.svg',
    alt: 'Python code window with a rising sequence of colorful code blocks',
    to: '/tools/python',
  },
  {
    title: 'Data Analysis',
    description: 'Learn how to clean, summarize, and find patterns in structured data.',
    image: '/images/data-science-topics/data-analysis.svg',
    alt: 'Magnifying glass inspecting a small data table and analysis chart',
    to: '/tools/pandas',
  },
  {
    title: 'Machine Learning & AI',
    description: 'Explore model training, prediction, and responsible machine learning.',
    image: '/images/data-science-topics/machine-learning.svg',
    alt: 'Connected nodes forming a machine-learning network',
    to: '/tools/machine-learning',
  },
  {
    title: 'Pandas & NumPy',
    description: 'Work with DataFrames, arrays, and practical numerical operations.',
    image: '/images/data-science-topics/pandas-numpy.svg',
    alt: 'DataFrame grid alongside a NumPy-style array of values',
    to: '/tools',
  },
  {
    title: 'Data Visualization',
    description: 'Turn data into clear charts that communicate useful insights.',
    image: '/images/data-science-topics/visualization.svg',
    alt: 'Bar chart and line plot illustrating data visualization',
    to: '/tools/matplotlib',
  },
  {
    title: 'Database & SQL',
    description: 'Query relational data and understand tables, joins, and summaries.',
    image: '/images/data-science-topics/database-sql.svg',
    alt: 'Database cylinder connected to a SQL query panel',
    to: '/tools/sql',
  },
  {
    title: 'Cloud & AWS',
    description: 'Review cloud concepts, AWS learning resources, and lab guidance.',
    image: '/images/data-science-topics/cloud-aws.svg',
    alt: 'Cloud above connected computing nodes',
    to: '/cloud-aws',
  },
  {
    title: 'Coding Practice',
    description: 'Practice Python in the isolated editor and keep your learning moving.',
    image: '/images/data-science-topics/coding-practice.svg',
    alt: 'Code editor showing a Python function and run indicator',
    to: '/coding-practice',
  },
  {
    title: 'Virtual Labs',
    description: 'Explore guided lab activities and organize your practical work.',
    image: '/images/data-science-topics/virtual-labs.svg',
    alt: 'Laboratory flask and virtual experiment controls',
    to: '/lab-experiments',
  },
  {
    title: 'Projects & Datasets',
    description: 'Find datasets to investigate and apply your skills in projects.',
    image: '/images/data-science-topics/projects-datasets.svg',
    alt: 'Dataset cards arranged as a project planning board',
    to: '/datasets',
  },
];

export default function DashboardTopicCards() {
  return (
    <section className="ds-panel ds-topic-section" aria-labelledby="ds-topic-heading">
      <div className="ds-section-heading">
        <span className="ds-section-icon"><Compass size={17} /></span>
        <div><span className="ds-eyebrow">LEARN BY EXPLORING</span><h2 id="ds-topic-heading">EXPLORE DATA SCIENCE</h2></div>
      </div>
      <div className="ds-topic-grid">
        {topics.map(({ title, description, image, alt, to }) => (
          <Link className="ds-topic-card" key={title} to={to}>
            <span className="ds-topic-image-wrap">
              <img className="ds-topic-image" src={image} alt={alt} loading="lazy" />
            </span>
            <span className="ds-topic-card-copy">
              <strong>{title}</strong>
              <span className="ds-topic-description">{description}</span>
              <span className="ds-topic-explore">Explore <ArrowUpRight size={14} /></span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
