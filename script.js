// 1. CONFIGURAÇÕES INICIAIS
const API_KEY = '49adf6ceb00647d1bf1464a6dfff7459'; 
let todosOsJogos = [];
let ligasFavoritas = JSON.parse(localStorage.getItem('rbs_favoritos')) || [];

/**
 * FUNÇÃO DE INICIALIZAÇÃO
 * Executada assim que o site carrega
 */
async function iniciarApp() {
    // 1. Gera a barra de datas (Ontem, Hoje, Amanhã...)
    gerarBarraDeDatas(); 
    
    // 2. Busca os jogos de HOJE por padrão
    const dataHoje = new Date().toISOString().split('T')[0];
    const btnHoje = document.querySelector('.date-item.active');
    await carregarPorData(dataHoje, btnHoje);
    
    // 3. Ativa os sistemas de busca e filtros de categorias
    configurarBusca();
    configurarFiltros();
}

/**
 * GERA A BARRA DE DATAS DINAMICAMENTE
 */
function gerarBarraDeDatas() {
    const barra = document.getElementById('date-bar');
    if (!barra) return;

    barra.innerHTML = ''; 
    const hoje = new Date();

    // Cria 7 dias (3 passados, Hoje, 3 futuros)
    for (let i = -3; i <= 3; i++) {
        const dataReferencia = new Date();
        dataReferencia.setDate(hoje.getDate() + i);

        const dia = dataReferencia.getDate().toString().padStart(2, '0');
        const mesInput = (dataReferencia.getMonth() + 1).toString().padStart(2, '0');
        const mesNome = dataReferencia.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
        const ano = dataReferencia.getFullYear();

        const dataFormatadaAPI = `${ano}-${mesInput}-${dia}`;
        
        let label = `${dia} ${mesNome}`; 
        let classeExtra = "";

        if (i === -1) label = "Ontem";
        if (i === 0) {
            label = `Hoje (${dia} ${mesNome})`;
            classeExtra = "active";
        }
        if (i === 1) label = "Amanhã";

        const div = document.createElement('div');
        div.className = `date-item ${classeExtra}`;
        div.innerText = label;
        
        div.onclick = function() {
            carregarPorData(dataFormatadaAPI, this);
        };

        barra.appendChild(div);
    }
}

/**
 * BUSCA JOGOS NA API BASEADO NA DATA SELECIONADA
 */
async function carregarPorData(dataFinal, elemento) {
    const container = document.getElementById('container-jogos');
    if (!container) return;

    // Feedback visual de carregamento
    container.innerHTML = '<div style="text-align:center; color:white; padding:40px;">Buscando jogos...</div>';
    
    // Atualiza classe active na barra de datas
    document.querySelectorAll('.date-item').forEach(item => item.classList.remove('active'));
    if (elemento) elemento.classList.add('active');

    try {
        const response = await fetch(`https://api.football-data.org/v4/matches?dateFrom=${dataFinal}&dateTo=${dataFinal}`, {
            headers: { 'X-Auth-Token': API_KEY }
        });

        if (!response.ok) throw new Error("Erro na API");

        const data = await response.json();

        if (data.matches && data.matches.length > 0) {
            todosOsJogos = data.matches.map(m => {
                const dataJogo = new Date(m.utcDate);
                return {
                    leagueName: m.competition.name,
                    status: m.status,
                    horario: dataJogo.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                    homeTeam: { name: m.homeTeam.name, crest: m.homeTeam.crest },
                    awayTeam: { name: m.awayTeam.name, crest: m.awayTeam.crest },
                    score: { 
                        home: m.score.fullTime.home ?? (m.status === 'TIMED' || m.status === 'SCHEDULED' ? '-' : 0), 
                        away: m.score.fullTime.away ?? (m.status === 'TIMED' || m.status === 'SCHEDULED' ? '-' : 0) 
                    }
                };
            });
            renderizarPartidas(todosOsJogos);
        } else {
            container.innerHTML = `<p style="text-align:center; color:gray; padding:40px;">Nenhum jogo oficial encontrado para esta data.</p>`;
        }
    } catch (error) {
        console.warn("API falhou ou limite excedido. Usando dados simulados.");
        todosOsJogos = obterDadosSimulados();
        renderizarPartidas(todosOsJogos);
    }
}

/**
 * DESENHA OS JOGOS NA TELA
 */
function renderizarPartidas(matches) {
    const container = document.getElementById('container-jogos');
    if (!container) return;
    container.innerHTML = '';

    const ligas = {};
    matches.forEach(jogo => {
        if (!ligas[jogo.leagueName]) ligas[jogo.leagueName] = [];
        ligas[jogo.leagueName].push(jogo);
    });

    for (let nomeLiga in ligas) {
        let leagueHtml = `
            <div class="match-section">
                <div class="league-header">${nomeLiga.toUpperCase()}</div>
                <div class="match-list">
        `;

        ligas[nomeLiga].forEach(m => {
            const exibirPlacar = (m.status === 'FINISHED' || m.status === 'IN_PLAY' || m.status === 'PAUSED');
            
            leagueHtml += `
                <div class="match-row">
                    <div class="match-status">
                        ${m.status === 'IN_PLAY' ? '<span style="color:#00ff88; font-weight:bold;">Ao Vivo</span>' : m.horario}
                    </div>
                    <div class="teams-col">
                        <div class="team-line">
                            <img src="${m.homeTeam.crest}" onerror="this.src='favicon.png'"> 
                            ${m.homeTeam.name} 
                            <strong>${exibirPlacar ? m.score.home : ''}</strong>
                        </div>
                        <div class="team-line">
                            <img src="${m.awayTeam.crest}" onerror="this.src='favicon.png'"> 
                            ${m.awayTeam.name} 
                            <strong>${exibirPlacar ? m.score.away : ''}</strong>
                        </div>
                    </div>
                </div>
            `;
        });
        leagueHtml += `</div></div>`;
        container.innerHTML += leagueHtml;
    }
}

/**
 * SISTEMA DE BUSCA
 */
function configurarBusca() {
    const campoBusca = document.getElementById('input-busca');
    if (!campoBusca) return;

    campoBusca.addEventListener('input', () => {
        const termo = campoBusca.value.toLowerCase().trim();
        const filtrados = todosOsJogos.filter(j => {
            return j.homeTeam.name.toLowerCase().includes(termo) || 
                   j.awayTeam.name.toLowerCase().includes(termo) || 
                   j.leagueName.toLowerCase().includes(termo);
        });
        renderizarPartidas(filtrados);
    });
}

/**
 * FILTROS (AO VIVO, TODOS, MEUS JOGOS)
 */
function configurarFiltros() {
    const botoes = document.querySelectorAll('.filter-item');
    botoes.forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            botoes.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const texto = btn.innerText.trim();
            if (texto === "Todos os jogos") renderizarPartidas(todosOsJogos);
            if (texto === "Ao vivo") renderizarPartidas(todosOsJogos.filter(j => j.status === 'IN_PLAY' || j.status === 'LIVE'));
            if (texto === "Meus jogos") renderizarPartidas(todosOsJogos.filter(j => ligasFavoritas.includes(j.leagueName)));
        };
    });
}

function toggleMenu() {
    document.querySelector('.sidebar').classList.toggle('active');
    document.getElementById('overlay').classList.toggle('active');
}

/**
 * DADOS DE BACKUP (CASO A API ESTEJA FORA)
 */
function obterDadosSimulados() {
    return [
        {
            leagueName: "DADOS SIMULADOS (API OFFLINE)",
            status: "FINISHED",
            horario: "15:00",
            homeTeam: { name: "Time Exemplo A", crest: "favicon.png" },
            awayTeam: { name: "Time Exemplo B", crest: "favicon.png" },
            score: { home: 1, away: 0 }
        }
    ];
}

// EXECUTA O APP
iniciarApp();
