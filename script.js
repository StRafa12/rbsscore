// 1. CONFIGURAÇÕES INICIAIS
// Substitua o texto abaixo pela sua chave real que você recebe por e-mail no site Football-Data.org
const API_KEY = 'GET https://api.football-data.org/v4/matches'; 

let todosOsJogos = [];
let ligasFavoritas = JSON.parse(localStorage.getItem('rbs_favoritos')) || [];

// 2. FUNÇÃO DE INICIALIZAÇÃO (APENAS UMA!)
async function iniciarApp() {
    console.log("Iniciando aplicação...");
    
    try {
        // Tentativa de buscar dados reais da API
        const response = await fetch('https://api.football-data.org/v4/matches', {
            headers: { 'X-Auth-Token': API_KEY }
        });

        if (!response.ok) {
            throw new Error(`Erro na API: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.matches && data.matches.length > 0) {
            // Mapeia os dados da API para o formato do seu site
            todosOsJogos = data.matches.map(m => ({
                leagueName: m.competition.name,
                status: m.status,
                homeTeam: { 
                    name: m.homeTeam.tla || m.homeTeam.name, 
                    crest: m.homeTeam.crest // A API fornece o link da imagem
                },
                awayTeam: { 
                    name: m.awayTeam.tla || m.awayTeam.name, 
                    crest: m.awayTeam.crest 
                },
                score: { 
                    home: m.score.fullTime.home ?? 0, 
                    away: m.score.fullTime.away ?? 0 
                }
            }));
            console.log("Dados carregados da API com sucesso.");
        } else {
            throw new Error("Nenhum jogo encontrado na API hoje.");
        }
    } catch (error) {
        console.warn("Falha ao acessar API, usando dados simulados:", error.message);
        todosOsJogos = obterDadosSimulados();
    }
    
    // Após definir os jogos (reais ou simulados), renderiza e ativa funções
    renderizarPartidas(todosOsJogos);
    configurarBusca();
    configurarFiltros();
}

// 3. FUNÇÃO DE RENDERIZAÇÃO
function renderizarPartidas(matches) {
    const container = document.getElementById('container-jogos');
    if (!container) return;
    
    container.innerHTML = '';

    if (matches.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:white; padding:20px;">Nenhum jogo encontrado.</p>';
        return;
    }

    const ligas = {};
    matches.forEach(jogo => {
        const nomeLiga = jogo.leagueName;
        if (!ligas[nomeLiga]) ligas[nomeLiga] = [];
        ligas[nomeLiga].push(jogo);
    });

    for (let nomeLiga in ligas) {
        const isFavorita = ligasFavoritas.includes(nomeLiga);
        const estrelaClass = isFavorita ? 'fa-solid' : 'fa-regular';
        const estrelaColor = isFavorita ? 'style="color: #00ff88;"' : '';

        let leagueHtml = `
            <div class="match-section">
                <div class="league-header">
                    <i class="${estrelaClass} fa-star btn-favorito" ${estrelaColor} onclick="alternarFavorito('${nomeLiga}')"></i> 
                    ${nomeLiga.toUpperCase()}
                </div>
                <div class="match-list">
        `;

        ligas[nomeLiga].forEach(m => {
            leagueHtml += `
                <div class="match-row">
                    <div class="match-status">${m.status === 'FINISHED' ? 'Final' : 'Ao Vivo'}</div>
                    <div class="teams-col">
                        <div class="team-line"><img src="${m.homeTeam.crest}" onerror="this.src='favicon.png'"> ${m.homeTeam.name} <strong>${m.score.home}</strong></div>
                        <div class="team-line"><img src="${m.awayTeam.crest}" onerror="this.src='favicon.png'"> ${m.awayTeam.name} <strong>${m.score.away}</strong></div>
                    </div>
                </div>
            `;
        });
        leagueHtml += `</div></div>`;
        container.innerHTML += leagueHtml;
    }
}

// 4. CONFIGURAÇÃO DA BUSCA
function configurarBusca() {
    const campoBusca = document.getElementById('input-busca');
    if (!campoBusca) return;

    // Remove ouvintes antigos para não duplicar
    campoBusca.replaceWith(campoBusca.cloneNode(true));
    const novoCampoBusca = document.getElementById('input-busca');

    novoCampoBusca.addEventListener('input', () => {
        const termo = novoCampoBusca.value.toLowerCase().trim();
        const filtrados = todosOsJogos.filter(j => {
            return j.homeTeam.name.toLowerCase().includes(termo) || 
                   j.awayTeam.name.toLowerCase().includes(termo) || 
                   j.leagueName.toLowerCase().includes(termo);
        });
        renderizarPartidas(filtrados);
    });
}

// 5. FILTROS E FAVORITOS
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

function alternarFavorito(nomeLiga) {
    if (ligasFavoritas.includes(nomeLiga)) {
        ligasFavoritas = ligasFavoritas.filter(l => l !== nomeLiga);
    } else {
        ligasFavoritas.push(nomeLiga);
    }
    localStorage.setItem('rbs_favoritos', JSON.stringify(ligasFavoritas));
    renderizarPartidas(todosOsJogos);
}

function toggleMenu() {
    document.querySelector('.sidebar').classList.toggle('active');
    document.getElementById('overlay').classList.toggle('active');
}

// 6. DADOS SIMULADOS (Caso a API falhe ou exceda o limite)
function obterDadosSimulados() {
    return [
        {
            leagueName: "BRASIL: Copinha",
            status: "FINISHED",
            homeTeam: { name: "América SP", crest: "Am.png" },
            awayTeam: { name: "Inter Limeira", crest: "interdelimeira.png" },
            score: { home: 0, away: 2 }
        },
        {
            leagueName: "ALEMANHA: Bundesliga",
            status: "IN_PLAY",
            homeTeam: { name: "Bayern", crest: "al.png" },
            awayTeam: { name: "Dortmund", crest: "al.png" },
            score: { home: 1, away: 1 }
        }
    ];
}

// EXECUÇÃO
iniciarApp();
