const CORES = ['--verde', '--rosa', '--violeta', '--ciano', '--sol'];
const MAX_IMAGENS = 3;
const $ = s => document.querySelector(s);
const el = (tag, cls, txt) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt != null) e.textContent = txt;
  return e;
};
const reduzMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;

function digitar(alvo, texto) {
  if (reduzMovimento) { alvo.textContent = texto; return; }
  let i = 0;
  const t = setInterval(() => {
    alvo.textContent = texto.slice(0, ++i);
    if (i >= texto.length) clearInterval(t);
  }, 45);
}

function contar(e, fim) {
  if (reduzMovimento || fim < 2) { e.textContent = fim; return; }
  let n = 0;
  const t = setInterval(() => {
    e.textContent = ++n;
    if (n >= fim) clearInterval(t);
  }, 140);
}

function carrossel(imagens, titulo) {
  const box = el('div', 'car');
  const lista = (imagens || []).slice(0, MAX_IMAGENS);
  if (!lista.length) { box.append(el('div', 'vazio', 'Sem imagem')); return box; }

  const faixa = el('div', 'faixa');
  lista.forEach((src, i) => {
    const img = new Image();
    img.src = src;
    img.alt = `${titulo}, imagem ${i + 1} de ${lista.length}`;
    img.loading = 'lazy';
    img.draggable = false;
    faixa.append(img);
  });
  box.append(faixa);
  if (lista.length < 2) return box;

  let atual = 0;
  const pontos = el('div', 'dots');
  const ir = k => {
    atual = (k + lista.length) % lista.length;
    faixa.style.transform = `translateX(${-atual * 100}%)`;
    [...pontos.children].forEach((p, j) => p.setAttribute('aria-current', j === atual));
  };
  lista.forEach((_, j) => {
    const p = el('button');
    p.type = 'button';
    p.setAttribute('aria-label', `Ir para a imagem ${j + 1}`);
    p.onclick = () => ir(j);
    pontos.append(p);
  });
  const seta = (cls, txt, rotulo, passo) => {
    const b = el('button', `seta ${cls}`, txt);
    b.type = 'button';
    b.setAttribute('aria-label', rotulo);
    b.onclick = () => ir(atual + passo);
    return b;
  };
  box.append(seta('ant', '<', 'Imagem anterior', -1), seta('prox', '>', 'Próxima imagem', 1), pontos);

  let x0 = null;
  box.addEventListener('pointerdown', e => { x0 = e.clientX; });
  box.addEventListener('pointerup', e => {
    if (x0 !== null && Math.abs(e.clientX - x0) > 40) ir(atual + (e.clientX < x0 ? 1 : -1));
    x0 = null;
  });
  box.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') ir(atual - 1);
    if (e.key === 'ArrowRight') ir(atual + 1);
  });
  ir(0);
  return box;
}

function criarCard(p, i) {
  const card = el('article', 'card');
  card.style.setProperty('--i', i);
  card.style.setProperty('--cor', `var(${CORES[i % CORES.length]})`);
  card.append(carrossel(p.imagens, p.titulo));

  const corpo = el('div', 'corpo');
  if (p.categoria) corpo.append(el('span', 'selo', p.categoria));
  corpo.append(el('h3', '', p.titulo));
  const meta = [p.curso, p.ano].filter(Boolean).join(', ');
  if (meta) corpo.append(el('p', 'meta', meta));
  if (p.descricao) corpo.append(el('p', '', p.descricao));
  if (p.autores?.length) corpo.append(el('p', 'autores', `Equipe: ${p.autores.join(', ')}`));
  if (p.tecnologias?.length) {
    const ul = el('ul', 'tags');
    p.tecnologias.forEach(t => ul.append(el('li', '', t)));
    corpo.append(ul);
  }
  if (p.links?.length) {
    const div = el('div', 'links');
    p.links.forEach(l => {
      const a = el('a', 'btn', l.rotulo);
      a.href = l.url;
      a.target = '_blank';
      a.rel = 'noopener';
      div.append(a);
    });
    corpo.append(div);
  }
  card.append(corpo);
  return card;
}

function mostrar(projetos, categoria) {
  const lista = categoria ? projetos.filter(p => p.categoria === categoria) : projetos;
  const grade = $('#grade');
  grade.replaceChildren(...lista.map(criarCard));
  $('#contagem').textContent = `${lista.length} ${lista.length === 1 ? 'projeto' : 'projetos'}`;
}

function montarFiltros(projetos) {
  const cats = [...new Set(projetos.map(p => p.categoria).filter(Boolean))];
  if (cats.length < 2) return;
  const box = $('#filtros');
  [['Todos', ''], ...cats.map(c => [c, c])].forEach(([rotulo, valor], i) => {
    const b = el('button', 'chip', rotulo);
    b.type = 'button';
    b.setAttribute('aria-pressed', i === 0);
    b.onclick = () => {
      box.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', c === b));
      mostrar(projetos, valor);
    };
    box.append(b);
  });
}

function montarHud(projetos) {
  const autores = new Set(projetos.flatMap(p => p.autores || []));
  const cats = new Set(projetos.map(p => p.categoria).filter(Boolean));
  [['Projetos', projetos.length], ['Categorias', cats.size], ['Pessoas', autores.size]].forEach(([nome, n]) => {
    const d = el('div');
    const b = el('b', '', '0');
    d.append(b, el('span', '', nome));
    $('#hud').append(d);
    contar(b, n);
  });
}

async function iniciar() {
  const t = 'ASSUNTO: CIÊNCIA, TECNOLOGIA E CRIATIVIDADE  ★  '.repeat(3);
  document.querySelectorAll('#ticker span').forEach(s => (s.textContent = t));

  try {
    const r = await fetch('projetos.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error(r.status);
    const dados = await r.json();
    const projetos = dados.projetos || [];
    digitar($('#digita'), dados.portal?.frase || 'Projetos acadêmicos feitos por quem faz.');
    montarHud(projetos);
    montarFiltros(projetos);
    mostrar(projetos, '');
  } catch (e) {
    digitar($('#digita'), 'Projetos acadêmicos feitos por quem faz.');
    const erro = el('div', 'erro');
    erro.append(
      el('b', '', 'Não foi possível carregar projetos.json'),
      el('p', '', 'Abra o portal por um servidor local (por exemplo, a extensão Live Server do VS Code) ou publique no GitHub Pages. Se o servidor já estiver ativo, confira se o JSON está válido e se o arquivo está na mesma pasta do index.html.')
    );
    $('#grade').append(erro);
  }
}
iniciar();
const topo = document.querySelector('.topo');
window.addEventListener('scroll', () => {
  topo.classList.toggle('scrolled', window.scrollY > 10);
}, { passive: true });
