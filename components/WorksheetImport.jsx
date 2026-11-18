import { useEffect, useState } from 'react';
import { scanWorksheetFile, SHEET_PAGES, downloadWorksheetSvg } from '../lib/worksheet.js';

export default function WorksheetImport({ onImport, onPrint }) {
  const [file, setFile] = useState(null);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [note, setNote] = useState('');
  const [threshold, setThreshold] = useState(128);

  // Release temporary object URLs when the selected image changes or the panel unmounts.
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const chooseFile = event => {
    const next = event.target.files?.[0] || null;
    // Allow choosing the same file again after clearing/replacing it.
    event.target.value = '';
    if (next && !/^image\/(png|jpeg|webp)$/i.test(next.type)) {
      setFile(null);
      setPreviewUrl('');
      setNote('Выберите изображение PNG, JPG или WebP.');
      return;
    }
    if (next && next.size > 20 * 1024 * 1024) {
      setFile(null);
      setPreviewUrl('');
      setNote('Файл слишком большой. Максимальный размер — 20 МБ.');
      return;
    }
    setFile(next);
    setPreviewUrl(next ? URL.createObjectURL(next) : '');
    setNote('');
  };

  const importPage = async () => {
    if (!file) { setNote('Сначала выберите фото или скан бланка.'); return; }
    if (typeof onImport !== 'function') {
      setNote('Импорт не подключён к редактору: обработчик onImport не передан.');
      return;
    }
    setBusy(true);
    setNote('Ищу угловые метки и распознаю символы…');
    try {
      const result = await scanWorksheetFile(file, page, { threshold });
      await onImport(result);
      const parts = [`Импортировано символов: ${result.glyphs.length}.`];
      parts.push(`Лист успешно выровнен по четырём угловым меткам (${result.marksFound}/4).`);
      if (result.skipped?.length) parts.push(`Пропущены пустые/нечитаемые ячейки: ${result.skipped.join(' ')}.`);
      parts.push('Проверьте каждый знак в библиотеке — при необходимости дорисуйте его.');
      setNote(parts.join(' '));
    } catch (error) {
      setNote(error?.message || 'Не удалось обработать изображение.');
    } finally {
      setBusy(false);
    }
  };

  return <section className="panel worksheet-panel">
    <div className="section-heading"><div><small>РУКОПИСНЫЙ ВВОД</small><h2>Бланк и скан</h2></div><span className="worksheet-icon">▦</span></div>
    <p className="worksheet-copy">Распечатайте листы с ячейками, впишите символы тёмной ручкой (базовая линия — пунктир), затем загрузите фото или скан. Чёрные уголки листа нужны для выравнивания — не обрезайте их.</p>
    <button className="button full" type="button" onClick={onPrint}>▤ Печать всех страниц бланка</button>
    <button className="button full" type="button" onClick={() => { try { downloadWorksheetSvg(page); } catch (error) { setNote(error.message); } }}>⇩ Скачать эту страницу (SVG)</button>
    <label className="field-label worksheet-file">Фото или скан<input type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseFile}/></label>
    <label className="field-label">Страница бланка<select value={page} onChange={event => setPage(Number(event.target.value))}>{SHEET_PAGES.map((chars, index) => <option value={index} key={index}>Страница {index + 1} — {chars[0]}…{chars[chars.length - 1]}</option>)}</select></label>
    <label className="field-label">Чувствительность к чернилам: {threshold}<input type="range" min="60" max="200" value={threshold} onChange={event => setThreshold(Number(event.target.value))}/><small>Выше значение — захватываются более светлые штрихи (карандаш, слабая ручка).</small></label>
    {previewUrl && <img className="worksheet-preview" src={previewUrl} alt="Предпросмотр загруженного скана"/>}
    <button className="button full primary" type="button" disabled={busy || !file} onClick={importPage}>{busy ? 'Обработка…' : '⇧ Распознать страницу'}</button>
    {note && <p className="worksheet-note" role="status">{note}</p>}
    <small className="worksheet-warning">Символ привязывается к букве своей ячейки автоматически. Снимайте страницу целиком, ровно и при хорошем свете. Импортированные контуры требуют проверки перед экспортом.</small>
  </section>;
}
