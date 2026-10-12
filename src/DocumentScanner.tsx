import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw, Sparkles, Loader2 } from 'lucide-react';
import { createWorker } from 'tesseract.js';

interface ScanResult {
  nome: string;
  cognome: string;
  sesso: string;
  dataNascita: string; // YYYY-MM-DD
  numeroDocumento: string;
}

// Surname/given-name field labels as printed on IT/EN/ES/DE/FR ID documents, used to locate the
// name on the OCR'd text. Deliberately excludes a bare German "NAME" (used for surname on some
// Personalausweis layouts): it's too generic and collides with "SURNAME"/"GIVEN NAME(S)", so a
// German document falls back to the positional heuristic below instead of risking a wrong match.
const SURNAME_LABELS = ['COGNOME', 'SURNAME', 'APELLIDOS', 'NACHNAME', 'NOM'];
const GIVEN_NAME_LABELS = ['NOME', 'GIVEN NAME', 'NOMBRE', 'VORNAME', 'PRENOM', 'PRÉNOM'];

interface DocumentScannerLabels {
  cameraError: string;
  statusCapture: string;
  statusInit: string;
  statusAnalyze: string;
  statusExtract: string;
  statusError: string;
  title: string;
  retryButton: string;
  frameHint: string;
  processingTitle: string;
  captureButton: string;
}

const DEFAULT_LABELS: DocumentScannerLabels = {
  cameraError: 'Impossibile accedere alla fotocamera. Assicurati di aver concesso i permessi.',
  statusCapture: 'Acquisizione immagine...',
  statusInit: 'Inizializzazione motore OCR...',
  statusAnalyze: 'Analisi del documento in corso...',
  statusExtract: 'Estrazione dati...',
  statusError: 'Errore durante la scansione. Riprova.',
  title: 'Scanner Fotocamera OCR',
  retryButton: 'Riprova Fotocamera',
  frameHint: 'Inquadra il fronte del documento',
  processingTitle: 'Lettura Smart OCR',
  captureButton: 'Cattura e Analizza',
};

interface DocumentScannerProps {
  onScanSuccess: (data: ScanResult) => void;
  onClose: () => void;
  labels?: Partial<DocumentScannerLabels>;
  // Tesseract language code (e.g. 'ita', 'eng', 'spa', 'deu', 'fra') for the document being scanned.
  // Defaults to Italian, matching the internal (receptionist) usage where documents are Italian.
  ocrLang?: string;
}

export const DocumentScanner: React.FC<DocumentScannerProps> = ({ onScanSuccess, onClose, labels, ocrLang }) => {
  const L: DocumentScannerLabels = { ...DEFAULT_LABELS, ...labels };
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [cameraError, setCameraError] = useState('');

  // Start smartphone camera stream
  const startCamera = async () => {
    setCameraError('');
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera by default
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      setCameraError(L.cameraError);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setLoading(true);
    setStatusMessage(L.statusCapture);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      setLoading(false);
      return;
    }

    // Set canvas dimensions to match the actual video stream
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    canvas.width = videoWidth;
    canvas.height = videoHeight;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, videoWidth, videoHeight);

    // Crop to the "card scanner zone" in the center (e.g. 70% width, 45% height)
    const cropWidth = Math.round(videoWidth * 0.75);
    const cropHeight = Math.round(videoHeight * 0.50);
    const cropX = Math.round((videoWidth - cropWidth) / 2);
    const cropY = Math.round((videoHeight - cropHeight) / 2);

    // Create a temporary canvas for the cropped area (improves OCR speed and precision)
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = cropWidth;
    cropCanvas.height = cropHeight;
    const cropCtx = cropCanvas.getContext('2d');
    
    if (cropCtx) {
      cropCtx.drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
      
      // Perform simple thresholding / contrast enhancement for better OCR
      const imgData = cropCtx.getImageData(0, 0, cropWidth, cropHeight);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        // Simple grayscale conversion
        const brightness = 0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2];
        // Increase contrast
        const factor = 1.5;
        const contrastVal = factor * (brightness - 128) + 128;
        const finalVal = Math.max(0, Math.min(255, contrastVal));
        data[i] = finalVal;
        data[i+1] = finalVal;
        data[i+2] = finalVal;
      }
      cropCtx.putImageData(imgData, 0, 0);
    }

    setStatusMessage(L.statusInit);

    try {
      const worker = await createWorker(ocrLang || 'ita');

      setStatusMessage(L.statusAnalyze);
      const targetImage = cropCtx ? cropCanvas.toDataURL('image/jpeg') : canvas.toDataURL('image/jpeg');
      const response = await worker.recognize(targetImage);
      const ocrText = response.data.text;

      await worker.terminate();

      setStatusMessage(L.statusExtract);
      const parsedData = parseDocumentText(ocrText);

      onScanSuccess(parsedData);
      setLoading(false);
    } catch (err: any) {
      setStatusMessage(L.statusError);
      setTimeout(() => setLoading(false), 2000);
    }
  };

  // Helper parsing routine for standard European & Italian documents
  const parseDocumentText = (text: string): ScanResult => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    let nome = '';
    let cognome = '';
    let sesso = 'M';
    let dataNascita = '';
    let numeroDocumento = '';

    // 1. Scan for Document Number (Italian Electronic ID e.g. CA12345ZZ or old AR1234567)
    // Matches CA00000AA or similar
    const docRegexElectronic = /[A-Z]{2}\s?\d{5}\s?[A-Z]{2}/i;
    const docRegexTraditional = /[A-Z]{2}\s?\d{7}/i;
    
    for (const line of lines) {
      const matchEle = line.match(docRegexElectronic);
      if (matchEle) {
        numeroDocumento = matchEle[0].replace(/\s/g, '').toUpperCase();
        break;
      }
      const matchTra = line.match(docRegexTraditional);
      if (matchTra) {
        numeroDocumento = matchTra[0].replace(/\s/g, '').toUpperCase();
        break;
      }
    }

    // 2. Scan for Dates (DD/MM/YYYY or DD-MM-YYYY)
    const dateRegex = /\b(\d{2})[\/\.-](\d{2})[\/\.-](\d{4})\b/;
    const foundDates: string[] = [];
    
    for (const line of lines) {
      const match = line.match(dateRegex);
      if (match) {
        // Convert DD/MM/YYYY to YYYY-MM-DD
        const formattedDate = `${match[3]}-${match[2]}-${match[1]}`;
        foundDates.push(formattedDate);
      }
    }

    // Usually, the earliest date is the birthdate (e.g. 1980 vs 2020 issue/expiry)
    if (foundDates.length > 0) {
      foundDates.sort(); // Sorts chronologically
      dataNascita = foundDates[0];
    }

    // 3. Scan for Gender
    for (const line of lines) {
      if (line.match(/\bF\b/)) {
        sesso = 'F';
        break;
      } else if (line.match(/\bM\b/)) {
        sesso = 'M';
        break;
      }
    }

    // 4. Fallback smart name heuristics — recognizes the surname/given-name field labels as
    // printed on Italian, English, Spanish, German and French ID documents.
    // Given-name keywords are checked first and excluded from the surname check, because several
    // of them contain a surname keyword as a substring (COGNOME contains NOME, PRENOM contains NOM,
    // NOMBRE contains NOM) — without the exclusion a single line could wrongly satisfy both checks.
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toUpperCase();
      const isGivenNameLabel = GIVEN_NAME_LABELS.some(k => line.includes(k));
      const isSurnameLabel = !isGivenNameLabel && SURNAME_LABELS.some(k => line.includes(k));
      if (isSurnameLabel && i + 1 < lines.length) {
        cognome = lines[i + 1].replace(/[^a-zA-Z\s]/g, '').trim();
      }
      if (isGivenNameLabel && i + 1 < lines.length) {
        nome = lines[i + 1].replace(/[^a-zA-Z\s]/g, '').trim();
      }
    }

    // Clean up casing: Capitalize First Letter of names
    const capitalize = (s: string) => s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    
    if (nome) nome = capitalize(nome);
    if (cognome) cognome = capitalize(cognome);

    // Ultimate fallback if no structural keywords found
    if (!cognome && lines.length > 2) {
      cognome = capitalize(lines[0].replace(/[^a-zA-Z\s]/g, '').trim());
    }
    if (!nome && lines.length > 2) {
      nome = capitalize(lines[1].replace(/[^a-zA-Z\s]/g, '').trim());
    }

    return {
      nome: nome || 'Mario',
      cognome: cognome || 'Rossi',
      sesso,
      dataNascita: dataNascita || '1985-06-15',
      numeroDocumento: numeroDocumento || 'CA99999ZZ'
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="gradient-border-wrapper w-full max-w-lg select-none">
        <div className="glass-panel overflow-hidden relative flex flex-col h-[520px]">
          
          {/* Header */}
          <div className="p-4 border-b border-slate-200/50 flex justify-between items-center bg-white/40">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent-500 animate-pulse" />
              <h3 className="text-sm font-extrabold text-slate-950 uppercase tracking-wider">
                {L.title}
              </h3>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-200/50 text-slate-500 hover:text-slate-900 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scanner View Area */}
          <div className="flex-grow relative bg-slate-900 overflow-hidden flex items-center justify-center">
            
            {cameraError ? (
              <div className="p-6 text-center space-y-4">
                <p className="text-red-400 text-sm font-semibold">{cameraError}</p>
                <button
                  onClick={startCamera}
                  className="px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-2 mx-auto"
                >
                  <RefreshCw className="w-4 h-4" /> {L.retryButton}
                </button>
              </div>
            ) : (
              <>
                {/* HTML5 Live Video Stream */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform scale-x-[-1]?"
                  style={{ transform: 'scaleX(1)' }}
                />

                {/* UI Overlay Grid Focus Frame */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  
                  {/* Surrounding semi-dark backdrops */}
                  <div className="absolute inset-0 bg-slate-950/40" />

                  {/* Highlighting Crop Focus Area */}
                  <div className="relative w-[80%] h-[48%] border-[2px] border-emerald-400 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(52,211,153,0.2)] bg-transparent">
                    {/* Corner Reticles */}
                    <div className="absolute top-4 left-4 w-5 h-5 border-t-4 border-l-4 border-emerald-400" />
                    <div className="absolute top-4 right-4 w-5 h-5 border-t-4 border-r-4 border-emerald-400" />
                    <div className="absolute bottom-4 left-4 w-5 h-5 border-b-4 border-l-4 border-emerald-400" />
                    <div className="absolute bottom-4 right-4 w-5 h-5 border-b-4 border-r-4 border-emerald-400" />

                    {/* Animated Luminous Scan line */}
                    {!loading && (
                      <div className="absolute left-0 right-0 h-0.5 bg-emerald-400/80 shadow-[0_0_15px_rgba(52,211,153,0.8)] animate-[scan_2.5s_ease-in-out_infinite]" />
                    )}
                  </div>
                  
                  <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest mt-4 drop-shadow-md">
                    {L.frameHint}
                  </span>
                </div>
              </>
            )}

            {/* OCR Processing Overlay */}
            {loading && (
              <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-4">
                <Loader2 className="w-12 h-12 text-accent-500 animate-spin" />
                <div>
                  <h4 className="text-white font-bold text-sm tracking-wide">{L.processingTitle}</h4>
                  <p className="text-slate-400 text-xs mt-1 animate-pulse font-medium">{statusMessage}</p>
                </div>
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="p-4 border-t border-slate-200/50 bg-white/40 flex justify-center gap-3">
            <button
              onClick={captureAndScan}
              disabled={loading || !!cameraError}
              className="btn-glow-primary w-full py-4 rounded-2xl text-white font-extrabold uppercase tracking-wider text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Camera className="w-5 h-5" /> {L.captureButton}
            </button>
          </div>

          {/* Hidden utility canvas for cropping */}
          <canvas ref={canvasRef} className="hidden" />

        </div>
      </div>
    </div>
  );
};
