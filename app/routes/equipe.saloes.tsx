import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useAcessibilidade } from '~/components/Acessibilidade'
import { PainelDaEquipe, useEquipe } from '~/components/Equipe'
import {
  enviarFoto,
  listarSaloesDaEquipe,
  removerFoto,
  removerSalao,
  salvarSalao,
  urlDaFoto,
} from '~/lib/api'
import { nomeUnidade } from '~/lib/chamados'
import {
  FOTO_TAMANHO_MAXIMO,
  FOTOS_POR_SALAO,
  pessoasPorExtenso,
  validarDescricaoDaFoto,
  type Salao,
} from '~/lib/reservas'

export const Route = createFileRoute('/equipe/saloes')({
  head: () => ({
    meta: [{ title: 'Salões · Painel da equipe' }, { name: 'robots', content: 'noindex' }],
  }),
  component: () => (
    <PainelDaEquipe titulo="Cadastro dos salões">
      <Saloes />
    </PainelDaEquipe>
  ),
})

// Fotos de celular passam fácil de 4 MB: reduz para 1600 px antes de enviar.
async function prepararFoto(arquivo: File): Promise<Blob> {
  try {
    const imagem = await createImageBitmap(arquivo)
    const escala = Math.min(1, 1600 / Math.max(imagem.width, imagem.height))
    const tela = document.createElement('canvas')
    tela.width = Math.round(imagem.width * escala)
    tela.height = Math.round(imagem.height * escala)
    tela.getContext('2d')!.drawImage(imagem, 0, 0, tela.width, tela.height)
    const reduzida = await new Promise<Blob | null>((ok) => tela.toBlob(ok, 'image/jpeg', 0.85))
    return reduzida ?? arquivo
  } catch {
    return arquivo
  }
}

function Saloes() {
  const { anunciar } = useAcessibilidade()
  const { pin, unidade, falha, limparErro } = useEquipe()
  const [saloes, setSaloes] = useState<Salao[] | null>(null)

  const carregar = useCallback(async () => {
    try {
      const { saloes: lista } = await listarSaloesDaEquipe(unidade, pin)
      limparErro()
      setSaloes(lista)
    } catch (e) {
      falha(e)
    }
  }, [unidade, pin, falha, limparErro])

  useEffect(() => {
    setSaloes(null)
    carregar()
  }, [carregar])

  async function executar(acao: () => Promise<unknown>, sucesso: string) {
    try {
      await acao()
      anunciar(sucesso)
      await carregar()
      return true
    } catch (e) {
      falha(e)
      return false
    }
  }

  return (
    <>
      <section aria-labelledby="titulo-novo">
        <h2 id="titulo-novo">Novo salão em {nomeUnidade(unidade)}</h2>
        <FormularioDoSalao
          prefixo="novo"
          rotuloDoBotao="Cadastrar salão"
          aoSalvar={async (dados) =>
            executar(
              () => salvarSalao({ ...dados, unidade, ativo: true }, pin),
              `${dados.nome}: salão cadastrado. Agora adicione as fotos.`,
            )
          }
          limparAoSalvar
        />
      </section>

      <section aria-labelledby="titulo-lista">
        <h2 id="titulo-lista">
          {saloes === null
            ? 'Carregando salões…'
            : saloes.length === 1
              ? '1 salão cadastrado'
              : `${saloes.length} salões cadastrados`}
        </h2>
        {saloes?.length === 0 && (
          <p className="vazio">
            Nenhum salão cadastrado nesta unidade. Os clientes só conseguem reservar depois do
            primeiro cadastro.
          </p>
        )}
        <ul className="lista">
          {saloes?.map((salao) => (
            <li key={salao.id}>
              <article className="cartao">
                <div className="linha-topo">
                  <h3 className="mesa">{salao.nome}</h3>
                  <span className="situacao" data-status={salao.ativo ? 'concluido' : 'cancelado'}>
                    {salao.ativo ? 'Visível para clientes' : 'Oculto'}
                  </span>
                </div>
                <p>Até {pessoasPorExtenso(salao.capacidade)}</p>

                <details>
                  <summary className="botao botao-linha">Editar dados de {salao.nome}</summary>
                  <FormularioDoSalao
                    prefixo={salao.id}
                    inicial={salao}
                    rotuloDoBotao="Salvar alterações"
                    aoSalvar={(dados) =>
                      executar(
                        () => salvarSalao({ ...dados, unidade, ativo: salao.ativo, id: salao.id }, pin),
                        `${dados.nome}: dados atualizados.`,
                      )
                    }
                  />
                </details>

                <h4 className="legenda">
                  Fotos ({salao.fotos.length} de {FOTOS_POR_SALAO})
                </h4>
                {salao.fotos.length === 0 && (
                  <p className="dica">Sem fotos ainda. Salões com foto ajudam o cliente a escolher.</p>
                )}
                <ul className="fotos-equipe">
                  {salao.fotos.map((foto) => (
                    <li key={foto.id}>
                      <img src={urlDaFoto(foto.id)} alt={foto.descricao} loading="lazy" />
                      <p className="dica">{foto.descricao}</p>
                      <button
                        type="button"
                        className="botao botao-linha"
                        onClick={() =>
                          executar(() => removerFoto(salao.id, foto.id, pin), 'Foto removida.')
                        }
                      >
                        Remover foto<span className="sr-only">: {foto.descricao}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                {salao.fotos.length < FOTOS_POR_SALAO && (
                  <FormularioDeFoto
                    salao={salao}
                    aoEnviar={(arquivo, descricao) =>
                      executar(
                        async () => enviarFoto(salao.id, await prepararFoto(arquivo), descricao, pin),
                        `Foto adicionada: ${salao.nome}.`,
                      )
                    }
                  />
                )}

                <div className="acoes">
                  <button
                    type="button"
                    className="botao botao-linha"
                    onClick={() =>
                      executar(
                        () => salvarSalao({ ...salao, ativo: !salao.ativo }, pin),
                        salao.ativo
                          ? `${salao.nome}: oculto dos clientes.`
                          : `${salao.nome}: visível para os clientes.`,
                      )
                    }
                  >
                    {salao.ativo ? 'Ocultar dos clientes' : 'Mostrar aos clientes'}
                    <span className="sr-only">: {salao.nome}</span>
                  </button>
                  <button
                    type="button"
                    className="botao botao-linha"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Excluir ${salao.nome} e todas as fotos dele? Isso não pode ser desfeito.`,
                        )
                      ) {
                        executar(() => removerSalao(salao.id, pin), `${salao.nome}: salão excluído.`)
                      }
                    }}
                  >
                    Excluir salão<span className="sr-only"> {salao.nome}</span>
                  </button>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

function FormularioDoSalao({
  prefixo,
  inicial,
  rotuloDoBotao,
  aoSalvar,
  limparAoSalvar,
}: {
  prefixo: string
  inicial?: Salao
  rotuloDoBotao: string
  aoSalvar: (dados: { nome: string; capacidade: number; descricao: string }) => Promise<boolean>
  limparAoSalvar?: boolean
}) {
  const [nome, setNome] = useState(inicial?.nome ?? '')
  const [capacidade, setCapacidade] = useState(inicial ? String(inicial.capacidade) : '')
  const [descricao, setDescricao] = useState(inicial?.descricao ?? '')

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const ok = await aoSalvar({ nome, capacidade: Number(capacidade), descricao })
    if (ok && limparAoSalvar) {
      setNome('')
      setCapacidade('')
      setDescricao('')
    }
  }

  return (
    <form className="cartao" onSubmit={enviar}>
      <div className="campo">
        <label htmlFor={`${prefixo}-nome`}>Nome do salão</label>
        <input
          id={`${prefixo}-nome`}
          required
          maxLength={60}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
      </div>
      <div className="campo">
        <label htmlFor={`${prefixo}-capacidade`}>Quantidade de pessoas</label>
        <input
          id={`${prefixo}-capacidade`}
          required
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          value={capacidade}
          onChange={(e) => setCapacidade(e.target.value.replace(/\D/g, ''))}
        />
      </div>
      <div className="campo">
        <label htmlFor={`${prefixo}-descricao`}>Descrição (opcional)</label>
        <textarea
          id={`${prefixo}-descricao`}
          rows={3}
          maxLength={400}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          aria-describedby={`${prefixo}-dica`}
        />
        <p id={`${prefixo}-dica`} className="dica">
          Exemplo: climatizado, com vista para o mar, acesso sem degraus.
        </p>
      </div>
      <button type="submit" className="botao botao-principal">
        {rotuloDoBotao}
      </button>
    </form>
  )
}

function FormularioDeFoto({
  salao,
  aoEnviar,
}: {
  salao: Salao
  aoEnviar: (arquivo: File, descricao: string) => Promise<boolean>
}) {
  const { anunciar } = useAcessibilidade()
  const [descricao, setDescricao] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const arquivo = (form.elements.namedItem('arquivo') as HTMLInputElement).files?.[0]
    const validacao = validarDescricaoDaFoto(descricao)
    const problema = !arquivo
      ? 'Escolha o arquivo da foto.'
      : !validacao.ok
        ? validacao.erro
        : arquivo.size > FOTO_TAMANHO_MAXIMO * 5
          ? 'A foto é grande demais. Escolha uma com até 20 MB.'
          : ''
    if (problema || !arquivo) {
      setErro(problema)
      anunciar(problema)
      return
    }
    setErro('')
    setEnviando(true)
    anunciar('Enviando a foto…')
    const ok = await aoEnviar(arquivo, descricao)
    setEnviando(false)
    if (ok) {
      setDescricao('')
      form.reset()
    }
  }

  return (
    <form className="cartao" onSubmit={enviar}>
      <div className="campo">
        <label htmlFor={`${salao.id}-arquivo`}>Nova foto de {salao.nome}</label>
        <input id={`${salao.id}-arquivo`} name="arquivo" type="file" accept="image/jpeg,image/png,image/webp" />
      </div>
      <div className="campo">
        <label htmlFor={`${salao.id}-alt`}>O que a foto mostra?</label>
        <input
          id={`${salao.id}-alt`}
          maxLength={200}
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          aria-describedby={`${salao.id}-alt-dica`}
          aria-invalid={Boolean(erro)}
        />
        <p id={`${salao.id}-alt-dica`} className="dica">
          Obrigatório. Clientes cegos ouvem esta descrição no lugar da foto.
        </p>
        {erro && <p className="erro">{erro}</p>}
      </div>
      <button type="submit" className="botao botao-principal" aria-disabled={enviando} disabled={enviando}>
        {enviando ? 'Enviando…' : 'Adicionar foto'}
      </button>
    </form>
  )
}
