import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// Lets any page print a receipt with: const { printDocument } = usePrinter();
//   printDocument(<SaleReceipt ... />, '80mm');
const PrintContext = createContext({ printDocument: () => {} });

const PX_PER_MM = 96 / 25.4; // browsers draw 96 pixels per inch

// Returns the @page rule that sets the paper size for this print.
// Thermal paper is a long roll, so we make the "page" exactly as long
// as the receipt - no wasted paper and no page breaks in the middle.
function pageRule(paper, heightMm) {
  if (paper === 'A4') return '@page { size: A4; margin: 12mm; }';
  const width = paper === '58mm' ? 58 : 80;
  return `@page { size: ${width}mm ${heightMm}mm; margin: 0; }`;
}

// Waits until every picture (e.g. the logo) inside the element has loaded,
// so it is not missing from the printout.
function waitForImages(element) {
  const images = Array.from(element.querySelectorAll('img'));
  return Promise.all(
    images.map((img) => (img.complete ? Promise.resolve() : new Promise((done) => {
      img.onload = done;
      img.onerror = done;
    })))
  );
}

// Holds the document being printed and runs the browser's print dialog.
export function PrintProvider({ children }) {
  const [job, setJob] = useState(null); // { content, paper }
  const areaRef = useRef(null);

  // Starts printing "content" (a React element) on the given paper size.
  const printDocument = useCallback((content, paper = '80mm') => {
    setJob({ content, paper });
  }, []);

  // Once the document is on the page: measure it, set the paper size,
  // print, and tidy up afterwards.
  useEffect(() => {
    if (!job) return undefined;
    let cancelled = false;
    const style = document.createElement('style');

    function cleanUp() {
      document.body.classList.remove('printing');
      style.remove();
      setJob(null);
    }

    async function run() {
      await waitForImages(areaRef.current);
      if (cancelled) return;

      const heightMm = Math.ceil(areaRef.current.offsetHeight / PX_PER_MM) + 6;
      style.textContent = pageRule(job.paper, heightMm);
      document.head.appendChild(style);
      document.body.classList.add('printing');

      window.addEventListener('afterprint', cleanUp, { once: true });
      window.print();
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [job]);

  return (
    <PrintContext.Provider value={{ printDocument }}>
      {children}
      {job &&
        createPortal(
          <div className={`print-root print-paper-${job.paper}`} ref={areaRef}>
            {job.content}
          </div>,
          document.body
        )}
    </PrintContext.Provider>
  );
}

// Gives access to printDocument().
export function usePrinter() {
  return useContext(PrintContext);
}
