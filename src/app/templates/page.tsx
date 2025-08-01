'use client';

import { useState } from 'react';

type PatternType = 'open' | 'close' | 'self' | 'special';

interface ProjectTemplate {
  open: string[];
  close: string[];
  self: string[];
  special: string[];
}

const initialTemplates: Record<string, ProjectTemplate> = {
  MIR4: { open: [], close: [], self: [], special: [] },
  ArcheAge: { open: [], close: [], self: [], special: [] },
};

export default function TemplateManager() {
  const [projectTemplates, setProjectTemplates] = useState<Record<string, ProjectTemplate>>(initialTemplates);
  const [selectedProject, setSelectedProject] = useState<string>(Object.keys(initialTemplates)[0]);
  const [newProject, setNewProject] = useState('');
  const [pattern, setPattern] = useState('');
  const [patternType, setPatternType] = useState<PatternType>('open');

  const addProject = () => {
    const name = newProject.trim();
    if (!name || projectTemplates[name]) return;
    setProjectTemplates({ ...projectTemplates, [name]: { open: [], close: [], self: [], special: [] } });
    setSelectedProject(name);
    setNewProject('');
  };

  const addPattern = () => {
    if (!pattern.trim()) return;
    setProjectTemplates((prev) => ({
      ...prev,
      [selectedProject]: {
        ...prev[selectedProject],
        [patternType]: [...prev[selectedProject][patternType], pattern],
      },
    }));
    setPattern('');
  };

  const removePattern = (type: PatternType, index: number) => {
    setProjectTemplates((prev) => ({
      ...prev,
      [selectedProject]: {
        ...prev[selectedProject],
        [type]: prev[selectedProject][type].filter((_, i) => i !== index),
      },
    }));
  };

  const saveTemplates = () => {
    console.log(projectTemplates);
  };

  const list = Object.entries(projectTemplates[selectedProject] || {}).flatMap(([type, patterns]) =>
    patterns.map((p, index) => ({ pattern: p, type: type as PatternType, index }))
  );

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded shadow">
      <div className="flex flex-wrap items-end gap-2 mb-4">
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="border p-2 rounded flex-1"
        >
          {Object.keys(projectTemplates).map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <input
          value={newProject}
          onChange={(e) => setNewProject(e.target.value)}
          placeholder="새 프로젝트명"
          className="border p-2 rounded flex-1"
        />
        <button onClick={addProject} className="px-4 py-2 bg-blue-500 text-white rounded">
          추가
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-2 mb-4">
        <input
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          placeholder="정규식 패턴"
          className="border p-2 rounded flex-1"
        />
        <select
          value={patternType}
          onChange={(e) => setPatternType(e.target.value as PatternType)}
          className="border p-2 rounded"
        >
          <option value="open">open</option>
          <option value="close">close</option>
          <option value="self">self-closing</option>
          <option value="special">special</option>
        </select>
        <button onClick={addPattern} className="px-4 py-2 bg-green-500 text-white rounded">
          정규식 추가
        </button>
      </div>

      <ul className="border bg-gray-50 text-xs rounded divide-y">
        {list.length === 0 && (
          <li className="px-2 py-1 text-gray-500">등록된 정규식이 없습니다</li>
        )}
        {list.map(({ pattern, type, index }) => (
          <li key={`${type}-${index}`} className="flex justify-between items-center px-2 py-1">
            <span className="font-mono">{pattern}</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">{type}</span>
              <button
                onClick={() => removePattern(type, index)}
                className="text-red-500 hover:underline"
              >
                삭제
              </button>
            </div>
          </li>
        ))}
      </ul>

      <button
        onClick={saveTemplates}
        className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded"
      >
        저장
      </button>
    </div>
  );
}

