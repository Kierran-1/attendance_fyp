'use client';

import Link from 'next/link';
import { ChangeEvent, DragEvent, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  Upload,
  X,
} from 'lucide-react';

type Student = {
  id: string;
  studentNumber: string;
  name: string;
  program: string;
  nationality: string;
  schoolStatus: string;
};

type LecturerClass = {
  id: string;
  unitCode: string;
  unitName: string;
  day: string;
  time: string;
  location: string;
  lecturer?: string;
  classType?: string;
  group?: string;
  term?: string;
  sessionType?: 'Lecture' | 'Tutorial' | 'Lab';
  students: Student[];
  sessions: {
    id: string;
    date: string;
    time: string;
    venue: string;
    attendancePercentage: number;
    status: 'Completed' | 'Ongoing' | 'Scheduled';
    presentCount: number;
    absentCount: number;
    lateCount: number;
    sickCount: number;
  }[];
  createdAt: string;
};

type ParsedMetadata = {
  term?: string;
  unitCode?: string;
  unitName?: string;
  classType?: string;
  group?: string;
  day?: string;
  time?: string;
  room?: string;
  lecturer?: string;
};

function mapClassTypeToSessionType(
  classType?: string
): 'Lecture' | 'Tutorial' | 'Lab' {
  const value = (classType || '').toLowerCase();

  if (value.includes('lab')) return 'Lab';
  if (value.includes('tutorial') || value.includes('tu')) return 'Tutorial';
  return 'Lecture';
}

export default function UploadRosterPage() {
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string[][]>([]);
  const [uploadColumns, setUploadColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState({
    studentId: '',
    name: '',
    program: '',
  });
  const [parsedMetadata, setParsedMetadata] = useState<ParsedMetadata>({});
  const [uploadStep, setUploadStep] = useState<1 | 2>(1);
  const [isDragging, setIsDragging] = useState(false);
  const [importedClassName, setImportedClassName] = useState<string>('');

  const resetUploadState = () => {
    setUploadFile(null);
    setUploadPreview([]);
    setUploadColumns([]);
    setColumnMapping({
      studentId: '',
      name: '',
      program: '',
    });
    setParsedMetadata({});
    setUploadStep(1);
    setIsDragging(false);
    setImportedClassName('');
  };

  const parseAttendanceWorkbook = (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      window.alert('Please upload an Excel file (.xlsx or .xls).');
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const allRows = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          blankrows: false,
        }) as (string | number | null)[][];

        if (allRows.length < 7) {
          window.alert(
            'The file does not contain enough rows for the attendance format.'
          );
          return;
        }

        const row4 = allRows[2] || [];
        const row5 = allRows[3] || [];
        const row6 = allRows[4] || [];
        const row7 = allRows[5] || [];

        const row4Text = row4.map(String).join(' ');
        const row5Parts = row5
          .map((value) => String(value ?? '').trim())
          .filter((value) => value.length > 0);

        const termMatch = row4Text.match(/Term\s*:\s*([^,]+)/i);
        const term = termMatch ? termMatch[1].trim() : '';

        let unitCode = '';
        let unitName = '';

        const unitMatch = row4Text.match(/Unit\s*:?\s*([A-Z0-9]+)\s*-\s*(.+)$/i);
        if (unitMatch) {
          unitCode = unitMatch[1].trim();
          unitName = unitMatch[2].trim();
        } else if (row4Text.includes('Unit')) {
          const unitPart =
            row4Text.split('Unit').pop()?.replace(':', '').trim() || '';
          const parts = unitPart.split('-');
          unitCode = parts[0]?.trim() || '';
          unitName = parts.slice(1).join('-').trim() || '';
        }

        const classType = row5Parts[0] || '';
        const group = row5Parts[1] || '';
        const day = row5Parts[2] || '';
        const time = row5Parts[3] || '';
        const room = row5Parts[4] || '';
        const lecturer = row5Parts[5] || '';

        const headers: string[] = [];
        const maxCols = Math.max(row6.length, row7.length);

        for (let index = 0; index < maxCols; index += 1) {
          const topValue = String(row6[index] ?? '').trim();
          const bottomValue = String(row7[index] ?? '').trim();

          if (index < 8) {
            if (index === 0) headers.push(topValue || 'Sl.No');
            else if (index === 1) headers.push(topValue || 'Student Number');
            else if (index === 2) headers.push('Empty');
            else if (index === 3) headers.push(topValue || 'Student Name');
            else if (index === 4) headers.push(topValue || 'Program');
            else if (index === 5) headers.push(topValue || 'Registered Course');
            else if (index === 6) headers.push(topValue || 'Nationality');
            else if (index === 7) headers.push(topValue || 'School Status');
          } else {
            if (topValue && topValue.includes('/')) {
              headers.push(`Week_${topValue.replace(/\//g, '_')}`);
            } else if (topValue) {
              headers.push(topValue);
            } else if (bottomValue && /^\d+$/.test(bottomValue)) {
              headers.push(`Week_${bottomValue}`);
            } else {
              headers.push(`Column_${index + 1}`);
            }
          }
        }

        const coreHeaders = headers.slice(0, 8);

        const studentRows = allRows.slice(6).map((row) => {
          const padded = [...row.map((value) => String(value ?? ''))];
          while (padded.length < headers.length) padded.push('');
          return padded.slice(0, 8);
        });

        const findColumn = (patterns: string[]) => {
          return (
            coreHeaders.find((header) =>
              patterns.some((pattern) =>
                header.toLowerCase().includes(pattern.toLowerCase())
              )
            ) || ''
          );
        };

        setParsedMetadata({
          term,
          unitCode,
          unitName,
          classType,
          group,
          day,
          time,
          room,
          lecturer,
        });

        setImportedClassName(
          [unitCode, unitName].filter(Boolean).join(' - ') || 'Imported Class'
        );

        setUploadColumns(coreHeaders);
        setUploadPreview(studentRows);
        setUploadFile(file);
        setColumnMapping({
          studentId: findColumn(['student number']),
          name: findColumn(['student name']),
          program: findColumn(['program']),
        });
        setUploadStep(2);
      } catch (error) {
        console.error(error);
        window.alert(
          'Error parsing Excel file. Please check that it follows the expected attendance format.'
        );
      }
    };

    reader.readAsBinaryString(file);
  };

  const confirmImport = () => {
    if (!uploadFile) return;

    if (!columnMapping.studentId || !columnMapping.name) {
      window.alert('Please map at least Student ID and Name columns.');
      return;
    }

    const studentNumberCol = uploadColumns.indexOf(columnMapping.studentId);
    const nameCol = uploadColumns.indexOf(columnMapping.name);
    const programCol = columnMapping.program
      ? uploadColumns.indexOf(columnMapping.program)
      : -1;
    const nationalityCol = uploadColumns.findIndex((item) =>
      item.toLowerCase().includes('nationality')
    );
    const schoolStatusCol = uploadColumns.findIndex((item) =>
      item.toLowerCase().includes('school status')
    );

    const newStudents: Student[] = uploadPreview
      .filter((row) => row && row.length > 0 && row[0] !== '')
      .map((row, index) => {
        const studentNumber = String(row[studentNumberCol] ?? '').trim();
        const name = String(row[nameCol] ?? '').trim();

        if (!studentNumber || !name) return null;

        return {
          id: `student-${Date.now()}-${index}`,
          studentNumber,
          name,
          program:
            programCol >= 0 ? String(row[programCol] ?? '').trim() : '',
          nationality:
            nationalityCol >= 0 ? String(row[nationalityCol] ?? '').trim() : '',
          schoolStatus:
            schoolStatusCol >= 0 ? String(row[schoolStatusCol] ?? '').trim() : '',
        };
      })
      .filter((item): item is Student => item !== null);

    if (newStudents.length === 0) {
      window.alert('No valid students were found. Please check the column mappings.');
      return;
    }

    const importedClass: LecturerClass = {
      id: `class-${Date.now()}`,
      unitCode: parsedMetadata.unitCode || 'IMPORTED',
      unitName: parsedMetadata.unitName || 'Imported Class',
      day: parsedMetadata.day || 'TBA',
      time: parsedMetadata.time || 'TBA',
      location: parsedMetadata.room || 'TBA',
      lecturer: parsedMetadata.lecturer || 'TBA',
      classType: parsedMetadata.classType || 'Lecture',
      group: parsedMetadata.group || '',
      term: parsedMetadata.term || '',
      sessionType: mapClassTypeToSessionType(parsedMetadata.classType),
      students: newStudents,
      sessions: [],
      createdAt: new Date().toISOString().split('T')[0],
    };

    try {
      const existingRaw = localStorage.getItem('lecturerImportedClasses');
      const existing: LecturerClass[] = existingRaw ? JSON.parse(existingRaw) : [];
      const updated = [importedClass, ...existing];
      localStorage.setItem('lecturerImportedClasses', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save imported class to localStorage:', error);
      window.alert('The class was created, but saving to browser storage failed.');
      return;
    }

    window.alert(
      `Roster imported successfully for ${importedClass.unitCode} ${importedClass.unitName}.`
    );

    resetUploadState();
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) parseAttendanceWorkbook(file);
  };

  const handleDragState = (
    event: DragEvent<HTMLLabelElement>,
    active: boolean
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(active);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (file) parseAttendanceWorkbook(file);
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E4002B]">
            Lecturer Panel
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-900">
            Upload Roster
          </h1>
          <p className="mt-2 text-sm leading-7 text-gray-500">
            Upload a Swinburne attendance Excel file, preview student details, and
            save the class roster into browser storage.
          </p>
        </div>

        <Link
          href="/lecturer/classes"
          className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
        >
          <ArrowLeft size={16} />
          Back to Classes
        </Link>
      </section>

      <section className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
        {uploadStep === 1 && (
          <div className="space-y-6">
            <label
              htmlFor="roster-upload"
              onDragEnter={(e) => handleDragState(e, true)}
              onDragOver={(e) => handleDragState(e, true)}
              onDragLeave={(e) => handleDragState(e, false)}
              onDrop={handleDrop}
              className={`block cursor-pointer rounded-[28px] border-2 border-dashed p-10 text-center transition ${
                isDragging
                  ? 'border-[#E4002B] bg-rose-50'
                  : 'border-gray-200 bg-gray-50 hover:border-[#E4002B]/40 hover:bg-rose-50/40'
              }`}
            >
              <input
                id="roster-upload"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileInputChange}
                className="hidden"
              />

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-sm">
                <FileSpreadsheet size={28} className="text-[#E4002B]" />
              </div>

              <h2 className="mt-5 text-xl font-black tracking-tight text-gray-900">
                Drop Excel file here or click to upload
              </h2>

              <p className="mt-3 text-sm leading-7 text-gray-500">
                Supports .xlsx and .xls attendance roster files.
              </p>
            </label>
          </div>
        )}

        {uploadStep === 2 && (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 rounded-3xl border border-gray-100 bg-gray-50/60 p-5">
              <p className="text-sm font-bold text-gray-900">Selected file</p>
              <p className="text-sm text-gray-600">{uploadFile?.name || 'No file selected'}</p>
              <p className="text-sm text-gray-600">
                Parsed class: {importedClassName || 'Imported Class'}
              </p>
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-6">
                <div className="rounded-3xl border border-gray-100 bg-gray-50/70 p-5">
                  <h3 className="text-base font-bold text-gray-900">
                    Parsed Metadata
                  </h3>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                        Term
                      </p>
                      <p className="mt-2 text-sm font-semibold text-gray-800">
                        {parsedMetadata.term || '—'}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                        Unit Code
                      </p>
                      <p className="mt-2 text-sm font-semibold text-gray-800">
                        {parsedMetadata.unitCode || '—'}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white px-4 py-3 sm:col-span-2">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                        Unit Name
                      </p>
                      <p className="mt-2 text-sm font-semibold text-gray-800">
                        {parsedMetadata.unitName || '—'}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                        Class Type
                      </p>
                      <p className="mt-2 text-sm font-semibold text-gray-800">
                        {parsedMetadata.classType || '—'}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                        Group
                      </p>
                      <p className="mt-2 text-sm font-semibold text-gray-800">
                        {parsedMetadata.group || '—'}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                        Day
                      </p>
                      <p className="mt-2 text-sm font-semibold text-gray-800">
                        {parsedMetadata.day || '—'}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                        Time
                      </p>
                      <p className="mt-2 text-sm font-semibold text-gray-800">
                        {parsedMetadata.time || '—'}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                        Room
                      </p>
                      <p className="mt-2 text-sm font-semibold text-gray-800">
                        {parsedMetadata.room || '—'}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                        Lecturer
                      </p>
                      <p className="mt-2 text-sm font-semibold text-gray-800">
                        {parsedMetadata.lecturer || '—'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-gray-100 bg-gray-50/70 p-5">
                  <h3 className="text-base font-bold text-gray-900">
                    Column Mapping
                  </h3>

                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Student ID Column
                      </label>
                      <select
                        value={columnMapping.studentId}
                        onChange={(e) =>
                          setColumnMapping((prev) => ({
                            ...prev,
                            studentId: e.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
                      >
                        <option value="">Select column</option>
                        {uploadColumns.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Student Name Column
                      </label>
                      <select
                        value={columnMapping.name}
                        onChange={(e) =>
                          setColumnMapping((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
                      >
                        <option value="">Select column</option>
                        {uploadColumns.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Program Column
                      </label>
                      <select
                        value={columnMapping.program}
                        onChange={(e) =>
                          setColumnMapping((prev) => ({
                            ...prev,
                            program: e.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
                      >
                        <option value="">Optional</option>
                        {uploadColumns.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-gray-100 bg-white shadow-sm">
                <div className="border-b border-gray-100 px-6 py-4">
                  <h3 className="text-base font-bold text-gray-900">
                    Student Preview
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Preview of imported rows before confirmation
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500">
                      <tr>
                        {uploadColumns.slice(0, 8).map((column) => (
                          <th key={column} className="px-4 py-3 font-semibold">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {uploadPreview.slice(0, 12).map((row, rowIndex) => (
                        <tr key={rowIndex} className="border-t border-gray-100">
                          {row.map((cell, cellIndex) => (
                            <td
                              key={`${rowIndex}-${cellIndex}`}
                              className="px-4 py-3 text-gray-700"
                            >
                              {cell || '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="px-6 py-4 text-xs text-gray-500">
                  Showing up to 12 preview rows.
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={confirmImport}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#E4002B] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#C70026]"
              >
                <CheckCircle2 size={16} />
                Confirm Import
              </button>

              <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:border-[#E4002B]/20 hover:text-[#E4002B]">
                <Upload size={16} />
                Choose Another File
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={resetUploadState}
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:border-red-100 hover:text-red-600"
              >
                <X size={16} />
                Reset Upload
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}