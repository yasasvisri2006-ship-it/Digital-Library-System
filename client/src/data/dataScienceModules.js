const moduleOneFiles = [
  'Data Analysis and Analytics.pptx',
  'Data Collection and Data Pre-Processing.pptx',
  'Data Processing.ppt',
  'Data Types-lifecycle-and-applications.pptx',
  'Descriptive Analysis.pptx',
  'Diagnostic Analytics.pptx',
  'Exploratory Data Analys.pptx',
  'Introduction to Data Science 1 - Copy.pptx',
  'Introduction to Data Science 1.pptx',
  'Introduction to Data Science.pptx',
  'Mechanistic Analysis.pptx',
  'Predictive Analytics.pptx',
  'Prescriptive Analytics.pptx',
  'Skills for data science.pptx',
  'Tools For Data Science - 1.pptx',
  'Tools For Data Science.pptx',
];

const moduleTwoFiles = [
  'Decision Tree Classification Algorithm.pptx',
  'Decision Tree.pptx',
  'Dimensionality. PCA, LDA.pdf',
  'Feature Selection.pptx',
  'Storey_DecisionTrees.ppt',
  'User Retention.pptx',
];

export const dataScienceModules = Array.from({ length: 5 }, (_, index) => {
  const number = index + 1;
  const files = number === 1 ? moduleOneFiles : number === 2 ? moduleTwoFiles : [];

  return {
    id: String(number),
    number,
    title: `Module ${String(number).padStart(2, '0')}`,
    materials: files.map((originalFileName, materialIndex) => {
      const extension = originalFileName.split('.').pop().toUpperCase();
      return {
        id: `module-${number}-material-${materialIndex + 1}`,
        title: originalFileName.replace(/\.[^.]+$/, ''),
        originalFileName,
        fileType: extension,
        url: `/data-science/module${number}/${encodeURIComponent(originalFileName)}`,
        previewUrl: extension === 'PDF'
          ? `/data-science/module${number}/${encodeURIComponent(originalFileName)}`
          : `/data-science/previews/module${number}/${encodeURIComponent(originalFileName.replace(/\.[^.]+$/, '.pdf'))}`,
      };
    }),
  };
});
