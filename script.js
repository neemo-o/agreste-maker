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
const semMovimento = () => reduzMovimento || document.body.classList.contains('pausado');

function urlSegura(u, aceitaHash = false) {
  if (typeof u !== 'string') return null;
  const v = u.trim();
  if (!v) return null;
  if (aceitaHash && v === '#') return '#';
  try {
    const parsed = new URL(v, location.href);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? v : null;
  } catch {
    return null;
  }
}

function digitar(alvo, texto) {
  if (semMovimento()) { alvo.textContent = texto; return; }
  let i = 0;
  const t = setInterval(() => {
    if (semMovimento()) { alvo.textContent = texto; clearInterval(t); return; }
    alvo.textContent = texto.slice(0, ++i);
    if (i >= texto.length) clearInterval(t);
  }, 45);
}

function contar(e, fim) {
  if (semMovimento() || fim < 2) { e.textContent = fim; return; }
  let n = 0;
  const t = setInterval(() => {
    if (semMovimento()) { e.textContent = fim; clearInterval(t); return; }
    e.textContent = ++n;
    if (n >= fim) clearInterval(t);
  }, 140);
}

function carrossel(imagens, titulo, idxCard) {
  const box = el('div', 'car');
  const lista = (imagens || []).map(u => urlSegura(u)).filter(Boolean).slice(0, MAX_IMAGENS);
  if (!lista.length) { box.append(el('div', 'vazio', 'Sem imagem')); return box; }

  box.setAttribute('role', 'region');
  box.setAttribute('aria-roledescription', 'carousel');
  box.setAttribute('aria-label', `Galeria de ${titulo}`);

  const faixa = el('div', 'faixa');
  faixa.setAttribute('role', 'group');
  faixa.setAttribute('aria-label', 'Imagens');

  lista.forEach((src, i) => {
    const slide = el('div', 'slide');
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'slide');
    slide.setAttribute('aria-label', `${i + 1} de ${lista.length}`);

    const img = new Image();
    img.src = src;
    img.alt = `${titulo}, imagem ${i + 1} de ${lista.length}`;
    img.width = 800;
    img.height = 500;
    img.draggable = false;
    if (i === 0 && idxCard === 0) {
      img.fetchPriority = 'high';
    } else if (i > 0) {
      img.loading = 'lazy';
      img.fetchPriority = 'low';
      img.decoding = 'async';
    } else {
      img.loading = 'lazy';
      img.decoding = 'async';
    }
    slide.append(img);
    faixa.append(slide);
  });

  if (lista.length < 2) {
    box.append(faixa);
    return box;
  }

  faixa.tabIndex = 0;
  const status = el('p', 'sr');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  const pontos = el('nav', 'dots');
  pontos.setAttribute('aria-label', 'Escolher imagem');

  let atual = 0;
  let anunciado = 0;
  let pendente = null;
  let raf = 0;
  let fimTimer = 0;

  const marcar = idx => {
    [...pontos.children].forEach((p, j) => {
      if (j === idx) p.setAttribute('aria-current', 'true');
      else p.removeAttribute('aria-current');
    });
  };

  const settle = () => {
    const w = faixa.clientWidth || 1;
    const idx = Math.max(0, Math.min(lista.length - 1, Math.round(faixa.scrollLeft / w)));
    if (pendente !== null && idx !== pendente) return;
    pendente = null;
    atual = idx;
    marcar(idx);
    if (idx !== anunciado) {
      anunciado = idx;
      status.textContent = `Imagem ${idx + 1} de ${lista.length}`;
    }
  };

  const ir = k => {
    const alvo = (k + lista.length) % lista.length;
    const w = faixa.clientWidth || 1;
    const destino = alvo * w;
    atual = alvo;
    marcar(alvo);
    if (Math.abs(faixa.scrollLeft - destino) < 2) {
      pendente = null;
      return;
    }
    const instantaneo = semMovimento();
    pendente = alvo;
    faixa.scrollTo({ left: destino, behavior: instantaneo ? 'auto' : 'smooth' });
    if (instantaneo) settle();
  };

  const seta = (cls, txt, rotulo, passo) => {
    const b = el('button', `seta ${cls}`, txt);
    b.type = 'button';
    b.setAttribute('aria-label', rotulo);
    b.onclick = () => ir(atual + passo);
    return b;
  };

  lista.forEach((_, j) => {
    const p = el('button');
    p.type = 'button';
    p.setAttribute('aria-label', `Ir para a imagem ${j + 1}`);
    p.onclick = () => ir(j);
    pontos.append(p);
  });

  faixa.addEventListener('scroll', () => {
    if (!raf) {
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (pendente !== null) return;
        const w = faixa.clientWidth || 1;
        const idx = Math.max(0, Math.min(lista.length - 1, Math.round(faixa.scrollLeft / w)));
        if (idx !== atual) {
          atual = idx;
          marcar(idx);
        }
      });
    }
    clearTimeout(fimTimer);
    fimTimer = setTimeout(settle, 150);
  }, { passive: true });

  if ('onscrollend' in window) {
    faixa.addEventListener('scrollend', () => {
      clearTimeout(fimTimer);
      settle();
    });
  }

  faixa.addEventListener('keydown', e => {
    if (e.target !== faixa) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); ir(atual - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); ir(atual + 1); }
  });

  marcar(0);
  box.append(
    seta('ant', '<', 'Imagem anterior', -1),
    seta('prox', '>', 'Próxima imagem', 1),
    faixa,
    status,
    pontos
  );
  return box;
}

function criarCard(p, i) {
  const card = el('article', 'card');
  card.style.setProperty('--i', i);
  card.style.setProperty('--cor', `var(${CORES[i % CORES.length]})`);
  card.append(carrossel(p.imagens, p.titulo, i));

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
      const href = urlSegura(l.url, true);
      if (!href) return;
      const a = el('a', 'btn', l.rotulo);
      a.href = href;
      a.setAttribute('aria-label', `${l.rotulo}: ${p.titulo}`);
      if (href !== '#') {
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
      }
      div.append(a);
    });
    if (div.children.length) corpo.append(div);
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
    b.setAttribute('aria-pressed', String(i === 0));
    b.onclick = () => {
      box.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(c === b)));
      mostrar(projetos, valor);
    };
    box.append(b);
  });
}

function montarHud(projetos) {
  const autores = new Set(projetos.flatMap(p => p.autores || []));
  const cats = new Set(projetos.map(p => p.categoria).filter(Boolean));
  [['Projetos', projetos.length], ['Categorias', cats.size], ['Pessoas', autores.size]].forEach(([nome, n]) => {
    const li = el('li');
    const b = el('b', '', '0');
    li.append(b, el('span', '', nome));
    $('#hud').append(li);
    contar(b, n);
  });
}

async function iniciar() {
  const btnPausa = $('#pausa');
  if (btnPausa) {
    if (reduzMovimento) {
      document.body.classList.add('pausado');
      btnPausa.setAttribute('aria-pressed', 'true');
    }
    btnPausa.addEventListener('click', () => {
      const pausado = document.body.classList.toggle('pausado');
      btnPausa.setAttribute('aria-pressed', String(pausado));
    });
  }

  const t = 'ASSUNTO: CIÊNCIA, TECNOLOGIA E CRIATIVIDADE  ★  '.repeat(3);
  document.querySelectorAll('#ticker span').forEach(s => (s.textContent = t));

  try {
    const r = await fetch('projetos.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error(r.status);
    const dados = await r.json();
    const projetos = dados.projetos || [];
    digitar($('#digita'), dados.portal?.frase || 'Inovamos ideias, criamos possibilidades e transformamos o futuro por meio da tecnologia.');
    montarHud(projetos);
    montarFiltros(projetos);
    mostrar(projetos, '');
  } catch (e) {
    digitar($('#digita'), 'Inovamos ideias, criamos possibilidades e transformamos o futuro por meio da tecnologia.');
    const erro = el('div', 'erro');
    erro.append(
      el('b', '', 'Não foi possível carregar projetos.json'),
      el('p', '', 'Abra o portal por um servidor local (por exemplo, a extensão Live Server do VS Code) ou publique no GitHub Pages. Se o servidor já estiver ativo, confira se o JSON está válido e se o arquivo está na mesma pasta do index.html.')
    );
    $('#grade').append(erro);
  }
}
iniciar();
const topo = $('.topo');
if (topo) {
  window.addEventListener('scroll', () => {
    topo.classList.toggle('scrolled', window.scrollY > 10);
  }, { passive: true });
}
