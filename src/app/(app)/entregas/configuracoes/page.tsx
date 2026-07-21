'use client'
import Header from '@/components/layout/Header'
import { Alert, Card, Field, Input, Select, Button } from '@/components/ui'

export default function ConfiguracoesEntregasPage() {
  return (
    <div className="vf-fadein">
      <Header title="Configurações de entregas" />
      <div className="vf-page max-w-4xl space-y-4">
        <div className="vf-page-header">
          <div>
            <h1 className="text-2xl font-bold text-[var(--vf-text)]">Configurações do módulo Entregas</h1>
            <p className="mt-1 text-sm text-[var(--vf-text3)]">Área preparada para parâmetros operacionais sem prometer salvamento inexistente.</p>
          </div>
        </div>

        <Alert type="info">
          A estrutura de entregas já está pronta para Google Maps externo, recibos, dispositivos e notificações. Os campos abaixo são uma prévia visual da configuração; a persistência real deve ser ativada quando o provedor de notificações/rotas estiver definido.
        </Alert>

        <Card className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Valor padrão sugerido — prévia">
            <Input type="number" step="0.01" placeholder="Ex: 5.00" disabled aria-disabled="true" />
          </Field>
          <Field label="Notificações — prévia">
            <Select defaultValue="visual" disabled aria-disabled="true">
              <option value="visual">Aviso visual e som no portal</option>
              <option value="fcm">FCM/Web Push quando configurado</option>
            </Select>
          </Field>
          <div className="md:col-span-2 flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--vf-border)] bg-[var(--vf-surface2)] p-3 text-sm text-[var(--vf-text3)]">
            <span className="font-bold text-[var(--vf-text)]">Sem falsa ação:</span>
            estes campos estão bloqueados até existir tabela/configuração persistente no banco.
            <Button type="button" variant="secondary" disabled>Prévia sem salvar</Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
