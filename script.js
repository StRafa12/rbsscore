const API_KEY = '49adf6ceb00647d1bf1464a6dfff7459'; 
let todosOsJogos = [];
let filtroStatusAtual = 'TODOS'; 

// 1. INICIALIZAÇÃO
async function iniciarApp() {
    gerarBarraDeDatas(); 
    configurarCalendario();
    configurarBusca();
    configurarFiltrosStatus(); 
    iniciarAutoRefresh();
    
    // Carrega o dia de hoje
    const dataHoje = new Date().toISOString().split('T')[0];
    await carregarPorData(dataHoje);
}

// 2. CONFIGURAÇÃO DOS FILTROS
function configurarFiltrosStatus() {
    const btnTodos = document.getElementById('btn-todos');
    const btnAoVivo = document.getElementById('btn-ao-vivo');
    const btnMeusJogos = document.getElementById('btn-meus-jogos');

    const gerenciarClique = (elemento, tipo) => {
        if (!elemento) return;
        document.querySelectorAll('.filter-item').forEach(i => i.classList.remove('active'));
        elemento.classList.add('active');
        filtroStatusAtual = tipo;
        aplicarFiltros();
    };

    if (btnTodos) btnTodos.onclick = (e) => { e.preventDefault(); gerenciarClique(btnTodos, 'TODOS'); };
    if (btnAoVivo) btnAoVivo.onclick = (e) => { e.preventDefault(); gerenciarClique(btnAoVivo, 'LIVE'); };
    if (btnMeusJogos) btnMeusJogos.onclick = (e) => { e.preventDefault(); gerenciarClique(btnMeusJogos, 'FAVS'); };
}

// 3. LÓGICA DE FILTRAGEM
function aplicarFiltros() {
    let filtrados = [...todosOsJogos];

    if (filtroStatusAtual === 'LIVE') {
        filtrados = filtrados.filter(j => 
            j.status === 'IN_PLAY' || j.status === 'LIVE' || j.status === 'PAUSED'
        );
    } else if (filtroStatusAtual === 'FAVS') {
        const favs = JSON.parse(localStorage.getItem('meusFavoritos') || '[]');
        filtrados = filtrados.filter(j => favs.includes(j.id));
    }

    const termo = document.getElementById('input-busca').value.toLowerCase();
    if (termo) {
        filtrados = filtrados.filter(j => 
            j.homeTeam.name.toLowerCase().includes(termo) || 
            j.awayTeam.name.toLowerCase().includes(termo) ||
            j.leagueName.toLowerCase().includes(termo)
        );
    }

    renderizarPartidas(filtrados);
}

// 4. FAVORITOS
function alternarFavorito(id) {
    let favs = JSON.parse(localStorage.getItem('meusFavoritos') || '[]');
    if (favs.includes(id)) {
        favs = favs.filter(f => f !== id);
    } else {
        favs.push(id);
    }
    localStorage.setItem('meusFavoritos', JSON.stringify(favs));
    aplicarFiltros(); 
}

function isFavorito(id) {
    const favs = JSON.parse(localStorage.getItem('meusFavoritos') || '[]');
    return favs.includes(id);
}

// 5. BUSCA DE DADOS
async function carregarPorData(dataFinal, elementoClicado) {
    const container = document.getElementById('container-jogos');
    if (!container) return;

    container.innerHTML = '<div style="text-align:center; color:white; padding:40px;"><i class="fa-solid fa-spinner fa-spin"></i> Buscando jogos...</div>';
    
    // Atualiza visual da barra de datas
    if (elementoClicado) {
        document.querySelectorAll('.date-item').forEach(item => item.classList.remove('active'));
        elementoClicado.classList.add('active');
    }

    try {
        const response = await fetch(`https://api.football-data.org/v4/matches?dateFrom=${dataFinal}&dateTo=${dataFinal}`, {
            headers: { 'X-Auth-Token': API_KEY }
        });
        const data = await response.json();

        if (data.matches) {
            todosOsJogos = data.matches.map(m => ({
                id: m.id,
                leagueName: m.competition.name,
                status: m.status,
                horario: new Date(m.utcDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                homeTeam: { name: m.homeTeam.name, crest: m.homeTeam.crest },
                awayTeam: { name: m.awayTeam.name, crest: m.awayTeam.crest },
                score: { 
                    home: m.score.fullTime.home ?? (m.status.includes('SCHEDULED') ? '-' : 0), 
                    away: m.score.fullTime.away ?? (m.status.includes('SCHEDULED') ? '-' : 0) 
                }
            }));
            aplicarFiltros();
        } else {
            container.innerHTML = '<div style="text-align:center; padding:40px;">Nenhum jogo encontrado.</div>';
        }
    } catch (e) { 
        console.error(e);
        container.innerHTML = '<div style="text-align:center; padding:40px;">Erro ao carregar API (Limite ou conexão).</div>';
    }
}

// 6. RENDERIZAÇÃO
function renderizarPartidas(matches) {
    const container = document.getElementById('container-jogos');
    if (!container) return;
    container.innerHTML = '';

    if (matches.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:gray; padding:20px;">Nenhum jogo corresponde ao filtro.</div>';
        return;
    }

    const ligas = {};
    matches.forEach(jogo => {
        if (!ligas[jogo.leagueName]) ligas[jogo.leagueName] = [];
        ligas[jogo.leagueName].push(jogo);
    });

    for (let nomeLiga in ligas) {
        let leagueHtml = `<div class="match-section"><div class="league-header">${nomeLiga.toUpperCase()}</div><div class="match-list">`;
        ligas[nomeLiga].forEach(m => {
            const vivo = m.status === 'IN_PLAY' || m.status === 'LIVE' || m.status === 'PAUSED';
            const starClass = isFavorito(m.id) ? 'fa-solid' : 'fa-regular';
            let statusHtml = vivo ? `<span class="live-dot"></span> <span class="status-live">Ao Vivo</span>` : (m.status === 'FINISHED' ? 'Fim' : m.horario);

            leagueHtml += `
                <div class="match-row">
                    <div class="fav-icon" onclick="alternarFavorito(${m.id})" style="color:#00ff88; cursor:pointer; padding-right:10px;">
                        <i class="${starClass} fa-star"></i>
                    </div>
                    <div class="match-status">${statusHtml}</div>
                    <div class="teams-col">
                        <div class="team-line">
                            <img src="${m.homeTeam.crest}" onerror="this.src='https://cdn-icons-png.flaticon.com/512/53/53283.png'" width="20"> 
                            <span class="team-name">${m.homeTeam.name}</span>
                            <strong class="score-number">${m.score.home}</strong>
                        </div>
                        <div class="team-line">
                            <img src="${m.awayTeam.crest}" onerror="this.src='https://cdn-icons-png.flaticon.com/512/53/53283.png'" width="20"> 
                            <span class="team-name">${m.awayTeam.name}</span>
                            <strong class="score-number">${m.score.away}</strong>
                        </div>
                    </div>
                </div>`;
        });
        leagueHtml += `</div></div>`;
        container.innerHTML += leagueHtml;
    }
}

// --- FUNÇÕES AUXILIARES QUE FALTAVAM ---

function gerarBarraDeDatas() {
    const dateBar = document.getElementById('date-bar');
    if (!dateBar) return;
    dateBar.innerHTML = '';

    const dias = [-2, -1, 0, 1, 2]; // Ontem, Hoje, Amanhã, etc.
    const hoje = new Date();

    dias.forEach(offset => {
        const d = new Date();
        d.setDate(hoje.getDate() + offset);
        
        const isoDate = d.toISOString().split('T')[0];
        const diaSemana = d.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase().replace('.', '');
        const diaMes = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

        const div = document.createElement('div');
        div.className = `date-item ${offset === 0 ? 'active' : ''}`;
        div.innerHTML = `<div>${diaSemana}</div><div style="font-size:0.8rem">${diaMes}</div>`;
        
        div.onclick = () => carregarPorData(isoDate, div);
        dateBar.appendChild(div);
    });
}

function configurarCalendario() {
    const input = document.getElementById('calendario-escolher');
    if (input) {
        input.onchange = (e) => {
            const data = e.target.value;
            if(data) carregarPorData(data, null);
        };
    }
}

function configurarBusca() {
    const input = document.getElementById('input-busca');
    if (input) {
        input.addEventListener('input', () => aplicarFiltros());
    }
}

function iniciarAutoRefresh() {
    // Atualiza os dados a cada 60 segundos
    setInterval(() => {
        if (filtroStatusAtual === 'LIVE') {
            const hoje = new Date().toISOString().split('T')[0];
            // Recarrega apenas se estivermos vendo jogos de hoje/live
            carregarPorData(hoje, null); 
        }
    }, 60000); 
}

// Menu Mobile
function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    if (sidebar && overlay) {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }
}

document.addEventListener('DOMContentLoaded', iniciarApp);
