// MIR4 Tag Reflector 개선된 UI + GitHub 배포용
"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";

type Template = {
  id: string;
  label: string;
  snippet: string;
};

type TagPattern = {
  id: string;
  pattern: string;
  type: "open" | "close" | "empty";
};

function renderFormattedText(input: string) {
  if (typeof input !== "string") input = String(input ?? "");
  const normalizedInput = input.replace(/\r\n?|\n/g, "\n");

  const tagSet: Set<string> = new Set();
  const tagCounts: Record<string, number> = {};
  const numberRegex = /[-+]?\d+(\.\d+)?/g;
  const openTagRegex = /<span[^>]*>/g;
  const closeTagRegex = /<\/>/g;
  const fullTagRegex = /<span color=\"(#[A-Za-z0-9_]+)\">(.*?)<\/>/g;
  const openTagOnlyRegex = /(<span color=\"(#[A-Za-z0-9_]+)\">[^<\n]*)/g;
  const singleColorTagRegex = /<([A-Fa-f0-9]{8})>([^<\n]*)<\/>/g;

  let output = "";
  const lines = normalizedInput.split("\n");

  lines.forEach((line, index) => {
    let replacedLine = line;

    replacedLine = replacedLine.replace(fullTagRegex, (match, color, text) => {
      tagSet.add(color);
      tagCounts[color] = (tagCounts[color] || 0) + 1;
      const colorClass =
        color === "#SkillInfo_Blue" ? "text-sky-500 bg-sky-100 px-1 rounded" :
        color === "#SkillInfo_Green" ? "text-green-600 bg-green-100 px-1 rounded" :
        color === "#SkillInfo_Yellow" ? "text-yellow-700 bg-yellow-100 px-1 rounded" :
        color === "#CC33CC" ? "text-purple-600 bg-purple-100 px-1 rounded" :
        color === "#FF644EFF" ? "text-pink-600 bg-pink-100 px-1 rounded" : "text-gray-800 bg-gray-100 px-1 rounded";
      return `<span class='${colorClass}' title='${color}'>${text}</span>`;
    });

    replacedLine = replacedLine.replace(singleColorTagRegex, (match, hexColor, text) => {
      tagSet.add(`#${hexColor}`);
      tagCounts[`#${hexColor}`] = (tagCounts[`#${hexColor}`] || 0) + 1;

      const colorClass = "text-black bg-yellow-100 px-1 rounded"; // 고정 스타일
      return `<span class='${colorClass}' title='#${hexColor}'>${text}</span>`;
    });

    replacedLine = replacedLine.replace(openTagOnlyRegex, (match) => {
      return `<span class='bg-red-200 text-red-800 px-1 rounded cursor-help' title='클로징 태그 </> 가 없습니다'>${match}</span>`;
    });

    replacedLine = replacedLine.replace(/([^>])<\/>/g, (_, prevChar) => {
      return `${prevChar}<span class='bg-red-200 text-red-800 px-1 rounded cursor-help' title='열린 <span ...> 태그가 없습니다'>&lt;/&gt;</span>`;
    });

    const hasError = replacedLine.includes("bg-red-200");
    const lineNumberStyle = hasError ? "text-red-500 font-bold" : "text-gray-400";
    const borderStyle = hasError ? "border-l-4 border-red-400 bg-red-50" : "";
    output += `<div class='${borderStyle} whitespace-pre-wrap break-words flex items-start px-1 py-0.5 rounded'><span class='${lineNumberStyle} select-none mr-2 w-6 text-right'>${index + 1}.</span><div class='flex-1'>${replacedLine}</div></div>`;
  });

  const openTags = (normalizedInput.match(openTagRegex) || []).length;
  const closeTags = (normalizedInput.match(closeTagRegex) || []).length;
  const numbers = (normalizedInput.match(numberRegex) || []).map(n => n);

  const errors: string[] = [];
  if (openTags !== closeTags) {
    errors.push(`❗ <span>(${openTags}) / </>(${closeTags}) 개수가 일치하지 않습니다.`);
  }

  return { output, tagSet, tagCounts, errors, lineCount: lines.length, numberList: numbers, openTags, closeTags };
}

function compareTags(
  sourceTags: Set<string>,
  targetTags: Set<string>,
  sourceCounts: Record<string, number>,
  targetCounts: Record<string, number>,
  sourceLineCount: number,
  targetLineCount: number,
  sourceNumbers: string[],
  targetNumbers: string[],
  sourceOpens: number,
  targetOpens: number,
  sourceCloses: number,
  targetCloses: number
) {
  const allTags = new Set([...sourceTags, ...targetTags]);
  const mismatchMessages: string[] = [];

  for (const tag of allTags) {
    const sourceCount = sourceCounts[tag] || 0;
    const targetCount = targetCounts[tag] || 0;
    if (sourceCount !== targetCount) {
      mismatchMessages.push(`❗ 태그 '${tag}' 개수가 다릅니다: 좌측 ${sourceCount} / 우측 ${targetCount}`);
    }
  }

  if (sourceLineCount !== targetLineCount) {
    mismatchMessages.push(`❗ 줄 수가 다릅니다: 좌측 ${sourceLineCount}줄 / 우측 ${targetLineCount}줄`);
  }

  if (sourceOpens !== targetOpens || sourceCloses !== targetCloses) {
    mismatchMessages.push(`❗ 전체 <span>(${sourceOpens}) / </>(${sourceCloses}) | 번역 <span>(${targetOpens}) / </>(${targetCloses})`);
  }

  const numberMismatch = sourceNumbers.filter(n => !targetNumbers.includes(n));
  const reverseMismatch = targetNumbers.filter(n => !sourceNumbers.includes(n));
  if (numberMismatch.length > 0 || reverseMismatch.length > 0) {
    mismatchMessages.push(`❗ 숫자 값 차이: 원문만 ${numberMismatch.join(", ")} / 번역만 ${reverseMismatch.join(", ")}`);
  }

  return mismatchMessages.join("<br>");
}

function copyToClipboard(text: string, setToast: (msg: string) => void) {
  navigator.clipboard.writeText(text).then(() => {
    setToast("복사 완료");
    setTimeout(() => setToast(""), 2000);
  });
}

export default function Home() {
  const [toast, setToast] = useState("");
  const [excelData, setExcelData] = useState<string[][]>([]);
  const [keyCol, setKeyCol] = useState(0);
  const [sourceCol, setSourceCol] = useState(1);
  const [targetCol, setTargetCol] = useState(2);
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [start, setStart] = useState(false);
  const [manualSource, setManualSource] = useState("");
  const [manualTarget, setManualTarget] = useState("");
  const [manualResult, setManualResult] = useState<{
    source: ReturnType<typeof renderFormattedText>;
    target: ReturnType<typeof renderFormattedText>;
    mismatch: string;
  } | null>(null);

  const [templates, setTemplates] = useState<Template[]>([
    { id: "span", label: "<span color=\"\">...</>", snippet: "<span color=\"\"></>" },
    { id: "close", label: "</>", snippet: "</>" },
    { id: "br", label: "<br/>", snippet: "<br/>" },
  ]);
  const [selectedTemplate, setSelectedTemplate] = useState("span");
  const [newOpen, setNewOpen] = useState("");
  const [newClose, setNewClose] = useState("");

  const [tagPatterns, setTagPatterns] = useState<TagPattern[]>([
    { id: "default-open", pattern: "<span[^>]*>", type: "open" },
    { id: "default-close", pattern: "</>", type: "close" },
    { id: "default-br", pattern: "<br/?>", type: "empty" },
  ]);
  const [newPattern, setNewPattern] = useState("");
  const [newPatternType, setNewPatternType] = useState<TagPattern["type"]>("open");
  const [previewText, setPreviewText] = useState("");
  const sourceRef = useRef<HTMLTextAreaElement | null>(null);
  const targetRef = useRef<HTMLTextAreaElement | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const parsedData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];
      setExcelData(parsedData);
    };
    reader.readAsArrayBuffer(file);
  };

  const runManualCheck = () => {
    const src = renderFormattedText(manualSource);
    const tgt = renderFormattedText(manualTarget);
    const mismatch = compareTags(
      src.tagSet,
      tgt.tagSet,
      src.tagCounts,
      tgt.tagCounts,
      src.lineCount,
      tgt.lineCount,
      src.numberList,
      tgt.numberList,
      src.openTags,
      tgt.openTags,
      src.closeTags,
      tgt.closeTags
    );
    setManualResult({ source: src, target: tgt, mismatch });
  };

  const insertTemplateAtCursor = (
    ref: React.RefObject<HTMLTextAreaElement | null>,
    setValue: (v: string) => void
  ) => {
    const template = templates.find(t => t.id === selectedTemplate);
    if (!template || !ref.current) return;
    const el = ref.current;
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const newText = el.value.slice(0, start) + template.snippet + el.value.slice(end);
    setValue(newText);
    requestAnimationFrame(() => {
      const pos = start + template.snippet.length;
      el.selectionStart = el.selectionEnd = pos;
      el.focus();
    });
  };

  const addTemplate = () => {
    if (!newOpen.trim()) return;
    const snippet = newOpen + (newClose || "");
    const label = newClose ? `${newOpen}...${newClose}` : newOpen;
    const id = Date.now().toString();
    setTemplates([...templates, { id, label, snippet }]);
    setSelectedTemplate(id);
    setNewOpen("");
    setNewClose("");
  };

  const addPattern = () => {
    if (!newPattern.trim()) return;
    const id = Date.now().toString();
    setTagPatterns([...tagPatterns, { id, pattern: newPattern, type: newPatternType }]);
    setNewPattern("");
    setNewPatternType("open");
  };

  const previewOutput = () => {
    let result = previewText
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    tagPatterns.forEach(p => {
      try {
        const regex = new RegExp(p.pattern, "g");
        const cls =
          p.type === "open"
            ? "bg-blue-100 text-blue-800"
            : p.type === "close"
            ? "bg-red-100 text-red-800"
            : "bg-green-100 text-green-800";
        result = result.replace(regex, m => `<span class='${cls} px-1 rounded'>${m}</span>`);
      } catch {}
    });
    return result;
  };

  const columnOptions = excelData[0]?.map((header, idx) => (
    <option value={idx} key={idx}>{header || `열 ${idx}`}</option>
  ));

  return (
    <main className="min-h-screen bg-white text-black p-6 max-w-4xl mx-auto">
      {toast && (
        <div className="fixed top-5 right-5 bg-black text-white px-4 py-2 rounded-md shadow">
          {toast}
        </div>
      )}

      <h1 className="text-2xl font-bold mb-4">🌀 MIR4 Tag Reflector</h1>

      <label htmlFor="file-upload" className="block w-full text-center border-2 border-dashed border-gray-300 p-6 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100 transition">
        📁 파일 선택하기 또는 드래그 앤 드롭
      </label>
      <input id="file-upload" type="file" accept=".xlsx" onChange={handleFileUpload} className="hidden" />

      <div className="mt-6 p-4 bg-gray-50 rounded-lg space-y-3">
        <h2 className="font-semibold">직접 입력</h2>
        <div className="space-y-2">
          <h3 className="font-medium">정규식 관리</h3>
          <div className="flex items-center gap-2">
            <input
              value={newPattern}
              onChange={e => setNewPattern(e.target.value)}
              placeholder="regex"
              className="border p-1 flex-1"
            />
            <select
              value={newPatternType}
              onChange={e => setNewPatternType(e.target.value as TagPattern["type"])}
              className="border p-1"
            >
              <option value="open">Open</option>
              <option value="close">Close</option>
              <option value="empty">Empty</option>
            </select>
            <button onClick={addPattern} className="px-2 py-1 bg-indigo-600 text-white rounded">등록</button>
          </div>
          <ul className="text-sm text-gray-700 list-disc list-inside">
            {tagPatterns.map(p => (
              <li key={p.id}>[{p.type}] /{p.pattern}/</li>
            ))}
          </ul>
          <textarea
            value={previewText}
            onChange={e => setPreviewText(e.target.value)}
            placeholder="프리뷰용 텍스트"
            rows={2}
            className="border p-1 w-full"
          />
          <div
            className="border p-2 text-sm rounded"
            dangerouslySetInnerHTML={{ __html: previewOutput() }}
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            value={newOpen}
            onChange={e => setNewOpen(e.target.value)}
            placeholder="<tag>"
            className="border p-1 flex-1"
          />
          <input
            value={newClose}
            onChange={e => setNewClose(e.target.value)}
            placeholder="</tag>"
            className="border p-1 flex-1"
          />
          <button onClick={addTemplate} className="px-2 py-1 bg-indigo-600 text-white rounded">추가</button>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <select
              value={selectedTemplate}
              onChange={e => setSelectedTemplate(e.target.value)}
              className="border px-2"
            >
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            <button
              onClick={() => insertTemplateAtCursor(sourceRef, setManualSource)}
              className="px-2 py-1 bg-gray-200 rounded"
            >
              삽입
            </button>
          </div>
          <textarea
            ref={sourceRef}
            value={manualSource}
            onChange={e => setManualSource(e.target.value)}
            placeholder="Source"
            rows={3}
            className="border border-gray-300 rounded-md p-2 w-full shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <select
              value={selectedTemplate}
              onChange={e => setSelectedTemplate(e.target.value)}
              className="border px-2"
            >
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            <button
              onClick={() => insertTemplateAtCursor(targetRef, setManualTarget)}
              className="px-2 py-1 bg-gray-200 rounded"
            >
              삽입
            </button>
          </div>
          <textarea
            ref={targetRef}
            value={manualTarget}
            onChange={e => setManualTarget(e.target.value)}
            placeholder="Target"
            rows={3}
            className="border border-gray-300 rounded-md p-2 w-full shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <button onClick={runManualCheck} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition">검사 실행</button>
      </div>

      {manualResult && (
        <div className="space-y-2 mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-bold mb-1">소스 (줄 {manualResult.source.lineCount})</h3>
              <div className="border p-2 text-sm rounded" dangerouslySetInnerHTML={{ __html: manualResult.source.output }} />
            </div>
            <div>
              <h3 className="font-bold mb-1">번역 (줄 {manualResult.target.lineCount})</h3>
              <div className="border p-2 text-sm rounded" dangerouslySetInnerHTML={{ __html: manualResult.target.output }} />
            </div>
          </div>
          {(manualResult.source.errors.length > 0 || manualResult.target.errors.length > 0 || manualResult.mismatch.length > 0) && (
            <div className="mt-2 text-sm text-red-600">
              <strong>검사 결과:</strong>
              <ul className="list-disc list-inside">
                {manualResult.source.errors.map((e, i) => <li key={'ms'+i} dangerouslySetInnerHTML={{ __html: e }} />)}
                {manualResult.target.errors.map((e, i) => <li key={'mt'+i} dangerouslySetInnerHTML={{ __html: e }} />)}
                {manualResult.mismatch && <li dangerouslySetInnerHTML={{ __html: manualResult.mismatch }} />}
              </ul>
            </div>
          )}
        </div>
      )}

      {excelData.length > 0 && (
        <div className="space-y-2 mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex gap-4">
            <label>Key 열:
              <select value={keyCol} onChange={e => setKeyCol(Number(e.target.value))} className="border px-2 ml-2">
                {columnOptions}
              </select>
            </label>
            <label>Source 열:
              <select value={sourceCol} onChange={e => setSourceCol(Number(e.target.value))} className="border px-2 ml-2">
                {columnOptions}
              </select>
            </label>
            <label>Target 열:
              <select value={targetCol} onChange={e => setTargetCol(Number(e.target.value))} className="border px-2 ml-2">
                {columnOptions}
              </select>
            </label>
          </div>
          <label className="inline-flex items-center space-x-2">
            <input type="checkbox" checked={onlyErrors} onChange={() => setOnlyErrors(!onlyErrors)} />
            <span>❗ 이슈만 보기</span>
          </label>
          <button onClick={() => setStart(true)} className="ml-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition">검사 시작</button>
        </div>
      )}

      <div className="space-y-4 mt-6">
        {start && excelData.slice(1).map((row, index) => {
          const key = row[keyCol];
          const source = row[sourceCol] || "";
          const target = row[targetCol] || "";

          const sourceResult = renderFormattedText(source);
          const targetResult = renderFormattedText(target);
          const tagMismatch = compareTags(
            sourceResult.tagSet,
            targetResult.tagSet,
            sourceResult.tagCounts,
            targetResult.tagCounts,
            sourceResult.lineCount,
            targetResult.lineCount,
            sourceResult.numberList,
            targetResult.numberList,
            sourceResult.openTags,
            targetResult.openTags,
            sourceResult.closeTags,
            targetResult.closeTags
          );

          const hasIssue = sourceResult.errors.length > 0 || targetResult.errors.length > 0 || tagMismatch.length > 0;
          if (onlyErrors && !hasIssue) return null;

          return (
            <details key={index} className="border rounded p-4 bg-white shadow">
              <summary className="cursor-pointer font-semibold">
                {hasIssue ? "❗ 이슈 있음" : "✅ 통과"} — <span className="text-blue-700 hover:underline cursor-pointer" onClick={() => copyToClipboard(String(key), setToast)}>{key || `Row ${index + 1}`}</span>
              </summary>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <h3 className="font-bold mb-1">소스 (줄 {sourceResult.lineCount})</h3>
                  <div className="border p-2 text-sm rounded" dangerouslySetInnerHTML={{ __html: sourceResult.output }} />
                </div>
                <div>
                  <h3 className="font-bold mb-1">번역 (줄 {targetResult.lineCount})</h3>
                  <div className="border p-2 text-sm rounded" dangerouslySetInnerHTML={{ __html: targetResult.output }} />
                </div>
              </div>
              {(sourceResult.errors.length > 0 || targetResult.errors.length > 0 || tagMismatch.length > 0) && (
                <div className="mt-4 text-sm text-red-600">
                  <strong>검사 결과:</strong>
                  <ul className="list-disc list-inside">
                    {sourceResult.errors.map((e, i) => <li key={"se"+i} dangerouslySetInnerHTML={{ __html: e }} />)}
                    {targetResult.errors.map((e, i) => <li key={"te"+i} dangerouslySetInnerHTML={{ __html: e }} />)}
                    {tagMismatch && <li dangerouslySetInnerHTML={{ __html: tagMismatch }} />}
                  </ul>
                </div>
              )}
            </details>
          );
        })}
      </div>
    </main>
  );
}