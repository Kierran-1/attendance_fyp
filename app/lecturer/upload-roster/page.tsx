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

type ImportResult = {
  courseId: string;
  created: number;
  enrolled: number;
  skipped: number;
  errors: string[];
};

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
  const [sessionDates, setSessionDates] = useState<string[]>([]);
  const [uploadStep, setUploadStep] = useState<1 | 2 | 3>(1);
  const [isDragging, setIsDragging] = useState(false);
  const [importedClassName, setImportedClassName] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const resetUploadState = () => {
    setUploadFile(null);
    setUploadPreview([]);
    setUploadColumns([]);
    setColumnMapping({ studentId: '', name: '', program: '' });
    setParsedMetadata({});
    setSessionDates([]);
    setUploadStep(1);
    setIsDragging(false);
    setImportedClassName('');
    setImportResult(null);
    setImportError(null);
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
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const allRows = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          blankrows: false,
        }) as (string | number | Date | null)[][];

        if (allRows.length < 7) {
          window.alert('The file does not contain enough rows for the attendance format.');
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
        const termYear = parseInt((term || '').split('_')[0], 10) || new Date().getFullYear();

        let unitCode = '';
        let unitName = '';

        const unitMatch = row4Text.match(/Unit\s*:?\s*([A-Z0-9]+)\s*-\s*(.+)$/i);
        if (unitMatch) {
          unitCode = unitMatch[1].trim();
          unitName = unitMatch[2].trim();
        } else if (row4Text.includes('Unit')) {
          const unitPart = row4Text.split('Unit').pop()?.replace(':', '').trim() || '';
          const parts = unitPart.split('-');
          unitCode = parts[0]?.trim() || '';
          unitName = parts.slice(1).join('-').trim() || '';
        }

        // row5 may have each field in a separate cell, or all comma-separated in one cell
        const row5Single = row5Parts.length === 1 ? row5Parts[0].split(',').map(s => s.trim()) : row5Parts;
        const classType = row5Single[0] || '';
        const group = row5Single[1] || '';
        const day = row5Single[2] || '';
        const time = row5Single[3] || '';
        const room = row5Single[4] || '';
        const lecturer = row5Single[5] || '';

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

        const findColumn = (patterns: string[]) =>
          coreHeaders.find((header) =>
            patterns.some((pattern) => header.toLowerCase().includes(pattern.toLowerCase()))
          ) || '';

        // Find the row with the most MM/DD date strings — that is the session header row.
        function extractDatesFromRow(row: (string | number | Date | null)[]): string[] {
          const results: string[] = [];
          for (const cell of row) {
            if (cell instanceof Date && !isNaN(cell.getTime())) {
              results.push(cell.toISOString());
            } else {
              const val = String(cell ?? '').trim();
              const m = val.match(/^(\d{1,2})\/(\d{1,2})$/);
              if (m) {
                const mm = +m[1], dd = +m[2];
                if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
                  results.push(new Date(termYear, mm - 1, dd).toISOString());
                }
              }
            }
          }
          return results;
        }

        let parsedDates: string[] = [];
        for (const row of allRows) {
          const dates = extractDatesFromRow(row);
          if (dates.length > parsedDates.length) parsedDates = dates;
        }
        console.log(`[upload-roster] extracted ${parsedDates.length} session dates:`, parsedDates.slice(0, 5));
        setSessionDates(parsedDates);

        setParsedMetadata({ term, unitCode, unitName, classType, group, day, time, room, lecturer });
        setImportedClassName([unitCode, unitName].filter(Boolean).join(' - ') || 'Imported Class');
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
        window.alert('Error parsing Excel file. Please check that it follows the expected attendance format.');
      }
    };

    reader.readAsBinaryString(file);
  };

  const confirmImport = async () => {
    if (!uploadFile || !columnMapping.studentId || !columnMapping.name) {
      window.alert('Please map at least Student ID and Name columns.');
      return;
    }

    const studentNumberCol = uploadColumns.indexOf(columnMapping.studentId);
    const nameCol = uploadColumns.indexOf(columnMapping.name);
    const programCol = columnMapping.program ? uploadColumns.indexOf(columnMapping.program) : -1;

    const students = uploadPreview
      .filter((row) => row && row.length > 0 && row[0] !== '')
      .map((row) => {
        const studentId = String(row[studentNumberCol] ?? '').trim();
        const name = String(row[nameCol] ?? '').trim();
        if (!studentId || !name) return null;
        return {
          studentId,
          name,
          major: programCol >= 0 ? String(row[programCol] ?? '').trim() || null : null,
        };
      })
      .filter((s): s is { studentId: string; name: string; major: string | null } => s !== null);

    if (students.length === 0) {
      window.alert('No valid students were found. Please check the column mappings.');
      return;
    }

    const rawType = (parsedMetadata.classType || '').toUpperCase();
    const sessionType = (['LECTURE', 'TUTORIAL', 'LAB'].includes(rawType) ? rawType : 'LECTURE') as 'LECTURE' | 'TUTORIAL' | 'LAB';
    const termYear = parseInt((parsedMetadata.term || '').split('_')[0], 10) || new Date().getFullYear();

    setImporting(true);
    setImportError(null);

    try {
      const res = await fetch('/api/lecturer/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit: {
            code: parsedMetadata.unitCode || 'IMPORTED',
            name: parsedMetadata.unitName || 'Imported Course',
            semester: parsedMetadata.term || 'Unknown',
            year: termYear,
            sessionType,
            groupNo: parsedMetadata.group || '01',
            day: parsedMetadata.day || '',
            time: parsedMetadata.time || '',
            location: parsedMetadata.room || '',
            sessionDates: sessionDates.length > 0 ? sessionDates : undefined,
          },
          students,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setImportError(data.error || 'Import failed');
      } else {
        setImportResult(data as ImportResult);
        setUploadStep(3);
      }
    } catch {
      setImportError('Network error. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) parseAttendanceWorkbook(file);
  };

  const handleDragState = (event: DragEvent<HTMLLabelElement>, active: boolean) => {
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
    <div className="space-y-6 sm:space-y-8">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#E4002B]">
            Lecturer Panel
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-900">
            Upload Roster
          </h1>
          <p className="mt-2 text-sm leading-7 text-gray-500">
            Upload a Swinburne attendance Excel file to create a course and enroll students.
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

      <section className="rounded-2xl sm:rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
        {/* Step 1: File upload */}
        {uploadStep === 1 && (
          <div className="space-y-6">
            <label
              htmlFor="roster-upload"
              onDragEnter={(e) => handleDragState(e, true)}
              onDragOver={(e) => handleDragState(e, true)}
              onDragLeave={(e) => handleDragState(e, false)}
              onDrop={handleDrop}
              className={`block cursor-pointer rounded-2xl sm:rounded-[2rem] border-2 border-dashed p-10 text-center transition ${
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
                Supports .xlsx and .xls Swinburne attendance roster files.
              </p>
            </label>
          </div>
        )}

        {/* Step 2: Preview & confirm */}
        {uploadStep === 2 && (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-gray-50/60 p-5">
              <p className="text-sm font-bold text-gray-900">Selected file</p>
              <p className="text-sm text-gray-600">{uploadFile?.name || 'No file selected'}</p>
              <p className={`text-sm font-semibold ${sessionDates.length > 0 ? 'text-green-600' : 'text-red-500'}`}>
                Session dates parsed: {sessionDates.length} {sessionDates.length > 0 ? `(${new Date(sessionDates[0]).toLocaleDateString()} … ${new Date(sessionDates[sessionDates.length - 1]).toLocaleDateString()})` : '— will use weekly fallback'}
              </p>
              <p className="text-sm text-gray-600">
                Parsed class: {importedClassName || 'Imported Class'}
              </p>
            </div>

            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-6">
                <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-5">
                  <h3 className="text-base font-bold text-gray-900">Parsed Metadata</h3>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {[
                      { label: 'Term', value: parsedMetadata.term },
                      { label: 'Unit Code', value: parsedMetadata.unitCode },
                      { label: 'Unit Name', value: parsedMetadata.unitName, span: true },
                      { label: 'Class Type', value: parsedMetadata.classType },
                      { label: 'Group', value: parsedMetadata.group },
                      { label: 'Day', value: parsedMetadata.day },
                      { label: 'Time', value: parsedMetadata.time },
                      { label: 'Room', value: parsedMetadata.room },
                      { label: 'Lecturer', value: parsedMetadata.lecturer },
                    ].map(({ label, value, span }) => (
                      <div
                        key={label}
                        className={`rounded-2xl bg-white px-4 py-3${span ? ' sm:col-span-2' : ''}`}
                      >
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                          {label}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-gray-800">{value || '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-5">
                  <h3 className="text-base font-bold text-gray-900">Column Mapping</h3>

                  <div className="mt-4 space-y-4">
                    {[
                      { label: 'Student ID Column', key: 'studentId', required: true },
                      { label: 'Student Name Column', key: 'name', required: true },
                      { label: 'Program Column', key: 'program', required: false },
                    ].map(({ label, key, required }) => (
                      <div key={key}>
                        <label className="mb-2 block text-sm font-semibold text-gray-700">
                          {label}
                        </label>
                        <select
                          value={columnMapping[key as keyof typeof columnMapping]}
                          onChange={(e) =>
                            setColumnMapping((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#E4002B] focus:ring-2 focus:ring-rose-100"
                        >
                          <option value="">{required ? 'Select column' : 'Optional'}</option>
                          {uploadColumns.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl sm:rounded-[2rem] border border-gray-100 bg-white shadow-sm">
                <div className="border-b border-gray-100 px-6 py-4">
                  <h3 className="text-base font-bold text-gray-900">Student Preview</h3>
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
                            <td key={`${rowIndex}-${cellIndex}`} className="px-4 py-3 text-gray-700">
                              {cell || '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="px-6 py-4 text-xs text-gray-500">Showing up to 12 preview rows.</div>
              </div>
            </div>

            {importError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                {importError}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={confirmImport}
                disabled={importing}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#E4002B] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#C70026] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle2 size={16} />
                {importing ? 'Importing…' : 'Confirm Import'}
              </button>

              <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-[#E4002B]/20 hover:text-[#E4002B]">
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
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
              >
                <X size={16} />
                Reset
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Success */}
        {uploadStep === 3 && importResult && (
          <div className="space-y-6">
            <div className="flex flex-col items-center rounded-2xl sm:rounded-[2rem] bg-green-50 px-6 py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 size={32} className="text-green-600" />
              </div>
              <h2 className="mt-5 text-2xl font-black tracking-tight text-gray-900">
                Import Successful
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                {importedClassName} has been saved to the database.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: 'New Students Created', value: importResult.created },
                { label: 'Enrolled in Course', value: importResult.enrolled },
                { label: 'Already Enrolled (Skipped)', value: importResult.skipped },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-2xl sm:rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
                    {label}
                  </p>
                  <p className="mt-3 text-3xl font-black tracking-tight text-gray-900">{value}</p>
                </div>
              ))}
            </div>

            {importResult.errors.length > 0 && (
              <div className="rounded-2xl border border-yellow-200 bg-yellow-50 px-5 py-4">
                <p className="text-sm font-bold text-yellow-800">
                  {importResult.errors.length} row(s) had errors:
                </p>
                <ul className="mt-2 space-y-1 text-sm text-yellow-700">
                  {importResult.errors.map((e, i) => (
                    <li key={i}>• {e}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={resetUploadState}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#E4002B] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#C70026]"
              >
                <Upload size={16} />
                Import Another File
              </button>

              <Link
                href="/lecturer/classes"
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-[#E4002B]/20 hover:text-[#E4002B]"
              >
                <ArrowLeft size={16} />
                View Classes
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
