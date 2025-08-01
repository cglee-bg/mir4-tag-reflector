"use client";

import { useState } from "react";

interface RegexItem {
  id: string;
  pattern: string;
  type: "open" | "close" | "self" | "special";
}

export default function TemplateManager() {
  const [projects, setProjects] = useState<string[]>(["MIR4"]);
  const [selectedProject, setSelectedProject] = useState("MIR4");
  const [newProject, setNewProject] = useState("");

  const [pattern, setPattern] = useState("");
  const [patternType, setPatternType] = useState<RegexItem["type"]>("open");
  const [regexList, setRegexList] = useState<RegexItem[]>([]);

  const addProject = () => {
    const name = newProject.trim();
    if (!name || projects.includes(name)) return;
    setProjects([...projects, name]);
    setSelectedProject(name);
    setNewProject("");
  };

  const addPattern = () => {
    const value = pattern.trim();
    if (!value) return;
    const item: RegexItem = {
      id: Date.now().toString(),
      pattern: value,
      type: patternType,
    };
    setRegexList([...regexList, item]);
    setPattern("");
  };

  const removePattern = (id: string) => {
    setRegexList(regexList.filter((r) => r.id !== id));
  };

  const saveTemplates = () => {
    // TODO: implement persistence (local storage or API)
    console.log({ project: selectedProject, regexList });
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded shadow space-y-4">
      <div className="flex items-center gap-2">
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="border p-2 rounded flex-1"
        >
          {projects.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="새 프로젝트명"
          value={newProject}
          onChange={(e) => setNewProject(e.target.value)}
          className="border p-2 rounded flex-1"
        />
        <button
          onClick={addProject}
          className="bg-blue-500 text-white px-3 py-2 rounded"
        >
          추가
        </button>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="정규식 패턴 입력"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          className="border p-2 rounded flex-1"
        />
        <select
          value={patternType}
          onChange={(e) => setPatternType(e.target.value as RegexItem["type"])}
          className="border p-2 rounded"
        >
          <option value="open">open</option>
          <option value="close">close</option>
          <option value="self">self-closing</option>
          <option value="special">special</option>
        </select>
        <button
          onClick={addPattern}
          className="bg-green-500 text-white px-3 py-2 rounded"
        >
          추가
        </button>
      </div>

      <div className="space-y-1">
        {regexList.map((item) => (
          <div
            key={item.id}
            className="border bg-gray-50 text-xs flex items-center justify-between p-2 rounded"
          >
            <span className="font-mono break-all">{item.pattern}</span>
            <span className="ml-2 text-gray-500 uppercase">{item.type}</span>
            <button
              onClick={() => removePattern(item.id)}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              삭제
            </button>
          </div>
        ))}
      </div>

      <div className="text-right">
        <button
          onClick={saveTemplates}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          저장
        </button>
      </div>
    </div>
  );
}

