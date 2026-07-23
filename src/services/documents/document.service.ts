import { ReportError } from '@/core/errors/app-error'
export function printCurrentPage(){if(typeof window==='undefined')throw new ReportError('Impressão disponível apenas no navegador.');window.print()}
export async function downloadBlob(blob:Blob,filename:string){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
export function safeDocumentName(value:string){return value.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-|-$/g,'').toLowerCase()||'documento'}
