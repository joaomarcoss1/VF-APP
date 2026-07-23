'use client'
import React from 'react'
import { AlertTriangle } from 'lucide-react'
export class AppErrorBoundary extends React.Component<{children:React.ReactNode},{error:Error|null}>{
 state={error:null as Error|null}
 static getDerivedStateFromError(error:Error){return{error}}
 componentDidCatch(error:Error,info:React.ErrorInfo){console.error('[VF Nexus] erro de interface',error,info)}
 render(){if(!this.state.error)return this.props.children;return <div className="vf-error-page"><div className="vf-card vf-error-card"><AlertTriangle size={28}/><h1>Não foi possível abrir esta tela</h1><p>{this.state.error.message||'Ocorreu um erro inesperado.'}</p><button className="vf-button vf-button-primary" onClick={()=>this.setState({error:null})}>Tentar novamente</button></div></div>}
}
