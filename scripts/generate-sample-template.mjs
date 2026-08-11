/**
 * Run: node scripts/generate-sample-template.mjs
 * Outputs: sample-template.docx in the project root
 *
 * All {tags} are docxtemplater placeholders.
 * Upload this file to any profile as the resume template.
 */

import PizZip from 'pizzip';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'sample-template.docx');

// ─── helpers ───────────────────────────────────────────────────────────────

function rPr({ bold = false, size = 20, color = '000000', italic = false } = {}) {
  return [
    '<w:rPr>',
    '<w:rFonts w:ascii="Montserrat" w:hAnsi="Montserrat" w:cs="Montserrat"/>',
    bold   ? '<w:b/><w:bCs/>' : '',
    italic ? '<w:i/><w:iCs/>' : '',
    `<w:sz w:val="${size}"/><w:szCs w:val="${size}"/>`,
    `<w:color w:val="${color}"/>`,
    '</w:rPr>',
  ].join('');
}

function run(text, props = {}) {
  const space = text.includes('  ') || text.startsWith(' ') || text.endsWith(' ')
    ? ' xml:space="preserve"' : '';
  return `<w:r>${rPr(props)}<w:t${space}>${text}</w:t></w:r>`;
}

function tabRun() {
  return '<w:r><w:tab/></w:r>';
}

// Right-aligned tab stop at content width (Letter - 1in margins each side = 10440 twips)
const RIGHT_TAB = '<w:tabs><w:tab w:val="right" w:pos="10440"/></w:tabs>';

function para(runs, {
  align = '',
  spaceBefore = 0,
  spaceAfter = 80,
  borderBottom = false,
  indent = 0,
  rightTab = false,
} = {}) {
  const jc     = align ? `<w:jc w:val="${align}"/>` : '';
  const sp     = `<w:spacing w:before="${spaceBefore}" w:after="${spaceAfter}" w:line="276" w:lineRule="auto"/>`;
  const border = borderBottom
    ? '<w:pBdr><w:bottom w:val="single" w:sz="4" w:space="2" w:color="000000"/></w:pBdr>'
    : '';
  const ind    = indent ? `<w:ind w:left="${indent}"/>` : '';
  const tabs   = rightTab ? RIGHT_TAB : '';
  return `<w:p><w:pPr>${jc}${sp}${border}${ind}${tabs}</w:pPr>${Array.isArray(runs) ? runs.join('') : runs}</w:p>`;
}

function sectionHeading(title) {
  return para(
    run(title, { bold: true, size: 20, color: '000000' }),
    { align: 'center', spaceBefore: 160, spaceAfter: 60, borderBottom: true }
  );
}

// Invisible loop marker paragraph (white 1pt text)
function loopMarker(tag) {
  return para(run(tag, { size: 1, color: 'FFFFFF' }), { spaceBefore: 0, spaceAfter: 0 });
}

// ─── document XML ──────────────────────────────────────────────────────────

const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
  xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  mc:Ignorable="w14 w15">
<w:body>

${para(run('{name}', { bold: true, size: 52, color: '111827' }), { align: 'center', spaceBefore: 0, spaceAfter: 40 })}
${para(run('{target_job_title}', { size: 24, color: '374151' }), { align: 'center', spaceBefore: 0, spaceAfter: 40 })}
${para(
  [
    run('{address}', { size: 18, color: '374151' }),
    run(' · ', { size: 18, color: '6B7280' }),
    run('{phone}', { size: 18, color: '374151' }),
    run(' · ', { size: 18, color: '6B7280' }),
    run('{email}', { size: 18, color: '374151' }),
    run(' · ', { size: 18, color: '6B7280' }),
    run('{linkedin}', { size: 18, color: '374151' }),
  ],
  { align: 'center', spaceBefore: 0, spaceAfter: 0 }
)}
${para('', { spaceBefore: 0, spaceAfter: 0, borderBottom: true })}
${para(run('{professional_summary}', { size: 20, color: '1F2937' }), { spaceBefore: 80, spaceAfter: 0 })}
${sectionHeading('EDUCATION')}
${loopMarker('{#education}')}
${para(
  [
    run('{edu_university}', { size: 20, color: '111827' }),
    tabRun(),
    run('{edu_period}', { size: 20, color: '374151' }),
  ],
  { spaceBefore: 80, spaceAfter: 0, rightTab: true }
)}
${para(run('{edu_degree}', { bold: true, size: 20, color: '111827' }), { spaceBefore: 0, spaceAfter: 40 })}
${loopMarker('{/education}')}
${sectionHeading('SKILLS & OTHER')}
${para(run('{skills}', { size: 20, color: '1F2937' }), { spaceBefore: 80, spaceAfter: 0 })}
${sectionHeading('EXPERIENCE')}
${loopMarker('{#experiences}')}
${para(
  [
    run('{exp_company}', { size: 20, color: '111827' }),
    tabRun(),
    run('{exp_period}', { size: 20, color: '374151' }),
  ],
  { spaceBefore: 80, spaceAfter: 0, rightTab: true }
)}
${para(run('{exp_job_title}', { bold: true, size: 20, color: '111827' }), { spaceBefore: 0, spaceAfter: 20 })}
${loopMarker('{#exp_bullets}')}
${para(
  [
    run('\u2022 ', { size: 20, color: '374151' }),
    run('{bullet}', { size: 20, color: '1F2937' }),
  ],
  { spaceBefore: 0, spaceAfter: 20, indent: 360 }
)}
${loopMarker('{/exp_bullets}')}
${loopMarker('{/experiences}')}
<w:sectPr><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>
</w:body>
</w:document>`;

// ─── supporting XML files ──────────────────────────────────────────────────

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml"
    ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml"
    ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml"
    ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
  <Override PartName="/word/fontTable.xml"
    ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/>
</Types>`;

const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"
    Target="word/document.xml"/>
</Relationships>`;

// document.xml relationships — styles, settings, fontTable
const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles"
    Target="styles.xml"/>
  <Relationship Id="rId2"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings"
    Target="settings.xml"/>
  <Relationship Id="rId3"
    Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable"
    Target="fontTable.xml"/>
</Relationships>`;

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Montserrat" w:hAnsi="Montserrat" w:cs="Montserrat"/>
        <w:sz w:val="20"/><w:szCs w:val="20"/>
        <w:lang w:val="en-US"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr><w:spacing w:after="0"/></w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Default">
    <w:name w:val="Default"/>
    <w:basedOn w:val="Normal"/>
  </w:style>
</w:styles>`;

const settingsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:defaultTabStop w:val="720"/>
  <w:compat>
    <w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="14"/>
  </w:compat>
</w:settings>`;

const fontTableXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:font w:name="Montserrat">
    <w:charset w:val="00"/>
    <w:family w:val="swiss"/>
    <w:pitch w:val="variable"/>
  </w:font>
</w:fonts>`;

// ─── assemble zip ──────────────────────────────────────────────────────────

const zip = new PizZip();
zip.file('[Content_Types].xml', contentTypes);
zip.file('_rels/.rels', rels);
zip.file('word/document.xml', documentXml);
zip.file('word/_rels/document.xml.rels', docRels);
zip.file('word/styles.xml', stylesXml);
zip.file('word/settings.xml', settingsXml);
zip.file('word/fontTable.xml', fontTableXml);

const buf = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
writeFileSync(OUT, buf);
console.log(`✅  sample-template.docx created at:\n    ${OUT}`);
console.log('\nUpload it to any profile on the Profiles page to test DOCX generation.');
