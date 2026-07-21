import { redirect } from 'next/navigation'
export default async function MasterEmpresaUsuariosPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; redirect(`/master/empresas/${id}`) }
