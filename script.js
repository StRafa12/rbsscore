const API_TOKEN = 'GET https://api.football-data.org/v4/matches'; 
let todosOsJogos = []; 
let ligasFavoritas = JSON.parse(localStorage.getItem('rbs_favoritos')) || [];

async function carregarJogos() {
    if (!API_TOKEN) {
        todosOsJogos = obterDadosSimulados();
        renderizarPartidas(todosOsJogos);
    } else {
        try {
            const response = await fetch('https://api.football-data.org/v4/matches', {
                method: 'GET',
                headers: { 'X-Auth-Token': API_TOKEN }
            });
            const data = await response.json();
            todosOsJogos = data.matches;
            renderizarPartidas(todosOsJogos);
        } catch (error) {
            todosOsJogos = obterDadosSimulados();
            renderizarPartidas(todosOsJogos);
        }
    }
    configurarFiltros();
}

function renderizarPartidas(matches) {
    const container = document.getElementById('container-jogos');
    container.innerHTML = ''; 

    if (matches.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--texto); padding:20px;">Nenhum jogo encontrado.</p>';
        return;
    }

    const ligas = {};
    matches.forEach(jogo => {
        const nomeLiga = jogo.competition ? jogo.competition.name : jogo.leagueName;
        if (!ligas[nomeLiga]) ligas[nomeLiga] = [];
        ligas[nomeLiga].push(jogo);
    });

    for (let nomeLiga in ligas) {
        const isFavorita = ligasFavoritas.includes(nomeLiga);
        const estrelaClass = isFavorita ? 'fa-solid' : 'fa-regular';
        const estrelaColor = isFavorita ? 'style="color: var(--verde);"' : '';

        let leagueHtml = `
            <div class="match-section" data-liga="${nomeLiga}">
                <div class="league-header">
                    <i class="${estrelaClass} fa-star btn-favorito" ${estrelaColor} onclick="alternarFavorito('${nomeLiga}')"></i> 
                    ${nomeLiga.toUpperCase()}
                </div>
                <div class="match-list">
        `;

        ligas[nomeLiga].forEach(m => {
            const statusLabel = m.status === 'FINISHED' ? 'Final' : 'Ao Vivo';
            leagueHtml += `
                <div class="match-row">
                    <div class="match-status">${statusLabel}</div>
                    <div class="teams-col">
                        <div class="team-line"><img src="${m.homeTeam.crest}"> ${m.homeTeam.name} <strong>${m.score.fullTime.home ?? 0}</strong></div>
                        <div class="team-line"><img src="${m.awayTeam.crest}"> ${m.awayTeam.name} <strong>${m.score.fullTime.away ?? 0}</strong></div>
                    </div>
                </div>
            `;
        });
        leagueHtml += `</div></div>`;
        container.innerHTML += leagueHtml;
    }
}

// FUNÇÃO PARA FAVORITAR/DESFAVORITAR
function alternarFavorito(nomeLiga) {
    if (ligasFavoritas.includes(nomeLiga)) {
        ligasFavoritas = ligasFavoritas.filter(l => l !== nomeLiga);
    } else {
        ligasFavoritas.push(nomeLiga);
    }
    localStorage.setItem('rbs_favoritos', JSON.stringify(ligasFavoritas));
    
    // Recarrega a visualização atual para atualizar as estrelas
    const filtroAtivo = document.querySelector('.filter-item.active').innerText.trim();
    aplicarFiltro(filtroAtivo);
}

function configurarFiltros() {
    const filtros = document.querySelectorAll('.filter-item');
    filtros.forEach(filtro => {
        filtro.addEventListener('click', (e) => {
            e.preventDefault();
            filtros.forEach(f => f.classList.remove('active'));
            filtro.classList.add('active');
            aplicarFiltro(filtro.innerText.trim());
        });
    });
}

function aplicarFiltro(tipo) {
    if (tipo === "Todos os jogos") {
        renderizarPartidas(todosOsJogos);
    } else if (tipo === "Ao vivo") {
        const aoVivo = todosOsJogos.filter(j => j.status === 'IN_PLAY' || j.status === 'LIVE');
        renderizarPartidas(aoVivo);
    } else if (tipo === "Meus jogos") {
        const favoritos = todosOsJogos.filter(j => {
            const nomeLiga = j.competition ? j.competition.name : j.leagueName;
            return ligasFavoritas.includes(nomeLiga);
        });
        renderizarPartidas(favoritos);
    }
}

function obterDadosSimulados() {
    return [
        {
            leagueName: "BRASIL: Copinha",
            status: "FINISHED",
            homeTeam: { name: "América SP Sub-20", crest: "t1.png" },
            awayTeam: { name: "Inter de Limeira Sub-20", crest: "t2.png" },
            score: { fullTime: { home: 0, away: 0 } }
        },
        {
            leagueName: "INGLATERRA: Premier League",
            status: "IN_PLAY",
            homeTeam: { name: "Arsenal", crest: "t3.png" },
            awayTeam: { name: "Liverpool", crest: "t4.png" },
            score: { fullTime: { home: 1, away: 1 } }
        }
    ];
}

// Crie um objeto para guardar os placares anteriores e comparar
let placaresAnteriores = {};

// Função para tocar o som de alerta (você pode usar um link de áudio curto)
function tocarAlertaGol() {
    const audio = new Audio('https://www.soundjay.com/buttons/sounds/button-09.mp3'); 
    audio.play().catch(e => console.log("Áudio bloqueado pelo navegador até interação do usuário."));
}

function renderizarPartidas(matches) {
    const container = document.getElementById('container-jogos');
    container.innerHTML = ''; 

    const ligas = {};
    matches.forEach(jogo => {
        const idJogo = jogo.id || `${jogo.homeTeam.name}-${jogo.awayTeam.name}`;
        const placarAtual = `${jogo.score.fullTime.home}-${jogo.score.fullTime.away}`;

        // VERIFICA SE HOUVE GOL (Comparando com o placar anterior)
        if (placaresAnteriores[idJogo] && placaresAnteriores[idJogo] !== placarAtual) {
            tocarAlertaGol();
            // Aqui poderíamos disparar o efeito visual
        }
        placaresAnteriores[idJogo] = placarAtual;

        const nomeLiga = jogo.competition ? jogo.competition.name : jogo.leagueName;
        if (!ligas[nomeLiga]) ligas[nomeLiga] = [];
        ligas[nomeLiga].push(jogo);
    });

    for (let nomeLiga in ligas) {
        const isFavorita = ligasFavoritas.includes(nomeLiga);
        const estrelaClass = isFavorita ? 'fa-solid' : 'fa-regular';
        
        let leagueHtml = `
            <div class="match-section">
                <div class="league-header">
                    <i class="${estrelaClass} fa-star btn-favorito" onclick="alternarFavorito('${nomeLiga}')"></i> 
                    ${nomeLiga.toUpperCase()}
                </div>
                <div class="match-list">
        `;

        ligas[nomeLiga].forEach(m => {
            const statusLabel = m.status === 'FINISHED' ? 'Final' : 'Ao Vivo';
            const statusClass = m.status === 'IN_PLAY' ? 'style="color: var(--verde);"' : '';

            leagueHtml += `
                <div class="match-row">
                    <div class="match-status" ${statusClass}>${statusLabel}</div>
                    <div class="teams-col">
                        <div class="team-line">
                            <img src="${m.homeTeam.crest}"> ${m.homeTeam.name} 
                            <strong class="placar-animar">${m.score.fullTime.home ?? 0}</strong>
                        </div>
                        <div class="team-line">
                            <img src="${m.awayTeam.crest}"> ${m.awayTeam.name} 
                            <strong class="placar-animar">${m.score.fullTime.away ?? 0}</strong>
                        </div>
                    </div>
                </div>
            `;
        });
        leagueHtml += `</div></div>`;
        container.innerHTML += leagueHtml;
    }
}

function toggleMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('overlay');
    
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

carregarJogos();