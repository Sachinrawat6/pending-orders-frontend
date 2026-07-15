import { useRef, useState } from 'react';
import { FiFileText } from 'react-icons/fi';

const FileDropzone = ({ onFile, fileName }) => {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (files) => {
    if (files && files[0]) onFile(files[0]);
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        handleFiles(event.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
        isDragging ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 bg-white hover:border-slate-400'
      }`}
    >
      <FiFileText className="h-7 w-7 text-slate-400" />
      <p className="text-sm font-medium text-slate-700">
        {fileName || 'Drop a CSV or Excel file here, or click to browse'}
      </p>
      <p className="text-xs text-slate-400">Supports .csv, .xlsx, .xls</p>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />
    </div>
  );
};

export default FileDropzone;
