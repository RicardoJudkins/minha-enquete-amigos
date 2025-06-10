// Seus detalhes de configuração do Firebase (COLE AQUI o trecho que você pegou no Console do Firebase)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Inicialize o Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Referências aos elementos HTML
const questionsSection = document.getElementById('questions-section');
const resultsSection = document.getElementById('results-section');
const resultsContainer = document.getElementById('results-container');
const submitVotesBtn = document.getElementById('submit-votes');
const showResultsBtn = document.getElementById('show-results-btn');
const backToPollBtn = document.getElementById('back-to-poll-btn');

// Elementos do alerta personalizado
const customAlert = document.getElementById('custom-alert');
// CORRIGIDO: Erro de digitação aqui. Removido 'document ='
const customAlertMessage = document.getElementById('custom-alert-message');
const closeAlertButton = customAlert.querySelector('.close-button');

// Variável para armazenar os votos temporariamente antes de enviar.
// A chave será o texto da pergunta, e o valor será o nome da pessoa votada.
let userCurrentVotes = {};
// Array de todas as pessoas votáveis (em ordem alfabética)
const people = ["Fernando", "Mayara", "Rafael", "Ricardo", "Samana"];

// Objeto para mapear nomes de pessoas para URLs de imagens
// Substitua os URLs dos placeholders pelos URLs reais das fotos dos seus amigos!
const personImages = {
    "Fernando": "https://raw.githubusercontent.com/RicardoJudkins/minha-enquete-amigos/main/images/Fernando.jpg",
    "Mayara": "https://raw.githubusercontent.com/RicardoJudkins/minha-enquete-amigos/main/images/Mayara.jpg",
    "Rafael": "https://raw.githubusercontent.com/RicardoJudkins/minha-enquete-amigos/main/images/Rafael.jpg",
    "Ricardo": "https://raw.githubusercontent.com/RicardoJudkins/minha-enquete-amigos/main/images/Ricardo.jpg",
    "Samana": "https://raw.githubusercontent.com/RicardoJudkins/minha-enquete-amigos/main/images/Samana.jpg"
};


// --- Funções de UI ---

// Função para exibir o alerta personalizado
function showAlert(message) {
    customAlertMessage.textContent = message;
    customAlert.style.display = 'flex'; // Use flex para centralizar
}

// Função para esconder o alerta personalizado
function hideAlert() {
    customAlert.style.display = 'none';
}

// Event listener para fechar o alerta
closeAlertButton.addEventListener('click', hideAlert);
// Clicar fora do conteúdo do alerta também fecha
window.addEventListener('click', (event) => {
    if (event.target === customAlert) {
        hideAlert();
    }
});


// Função para manipular cliques nos botões de voto
questionsSection.addEventListener('click', (event) => {
    const clickedButton = event.target.closest('button'); // Garante que pegamos o botão, mesmo se clicarmos na imagem/span

    // Garante que o clique foi em um botão e dentro de uma seção de opções
    if (clickedButton && clickedButton.closest('.options')) {
        const questionBlock = clickedButton.closest('.question-block');
        // Pega o texto da pergunta usando o atributo customizado 'data-question'
        const questionText = questionBlock.dataset.question;
        const selectedPerson = clickedButton.dataset.person;

        // Desseleciona OUTROS botões APENAS DESSA PERGUNTA
        // e garante que apenas um botão por pergunta fique selecionado visualmente
        const buttonsInQuestion = questionBlock.querySelectorAll('.options button');
        buttonsInQuestion.forEach(btn => btn.classList.remove('selected'));

        // Seleciona o botão clicado
        clickedButton.classList.add('selected');

        // Armazena o voto atual do usuário para ESTA pergunta
        userCurrentVotes[questionText] = selectedPerson;
        console.log(`Voto para "${questionText}": ${selectedPerson}`);
    }
});


// --- Funções de Interação com Firebase ---

// Função para enviar os votos para o Firebase
submitVotesBtn.addEventListener('click', async () => {
    // Pega todas as perguntas visíveis na tela
    const allQuestionsElements = document.querySelectorAll('.question-block');
    const totalQuestions = allQuestionsElements.length;

    // Verifica se o usuário votou em todas as perguntas
    if (Object.keys(userCurrentVotes).length !== totalQuestions) {
        showAlert('Por favor, vote em todas as perguntas antes de enviar!');
        return; // Sai da função se nem todas as perguntas foram respondidas
    }

    try {
        // Adiciona um novo documento à coleção 'votes'
        await db.collection('votes').add({
            timestamp: firebase.firestore.FieldValue.serverTimestamp(), // Adiciona um carimbo de data/hora
            votes: userCurrentVotes // Os votos da sessão atual do usuário
        });
        showAlert('Seus votos foram enviados com sucesso!');
        
        // Limpa os votos atuais do usuário e desmarca as seleções
        userCurrentVotes = {};
        document.querySelectorAll('.options button').forEach(btn => {
            btn.classList.remove('selected');
        });

        // Mostra o botão "Ver Resultados" e esconde o "Enviar Meus Votos"
        submitVotesBtn.style.display = 'none';
        showResultsBtn.style.display = 'block';

    } catch (error) {
        console.error("Erro ao enviar votos: ", error);
        showAlert('Ocorreu um erro ao enviar seus votos. Tente novamente.');
    }
});


// Função para obter e exibir os resultados
async function displayResults() {
    resultsContainer.innerHTML = ''; // Limpa resultados anteriores

    try {
        // Pega todos os documentos da coleção 'votes'
        const snapshot = await db.collection('votes').get();
        const allIndividualVotes = [];
        snapshot.forEach(doc => {
            allIndividualVotes.push(doc.data().votes); // Pega o objeto 'votes' de cada documento
        });

        // Pega todas as perguntas do HTML para garantir que processamos todas
        const allQuestionsFromHtml = Array.from(document.querySelectorAll('.question-block')).map(div => div.dataset.question);

        // Agrupa os votos por pergunta
        const aggregatedVotes = {};
        allQuestionsFromHtml.forEach(q => {
            // Inicializa a contagem para cada pessoa para cada pergunta
            aggregatedVotes[q] = {};
            people.forEach(p => {
                aggregatedVotes[q][p] = 0;
            });
        });

        allIndividualVotes.forEach(singleUserVotes => {
            for (const question in singleUserVotes) {
                const votedPerson = singleUserVotes[question];
                // Incrementa a contagem se a pessoa votada existir para a pergunta
                if (aggregatedVotes[question] && aggregatedVotes[question][votedPerson] !== undefined) {
                    aggregatedVotes[question][votedPerson]++;
                }
            }
        });

        // Itera sobre as perguntas para criar e exibir os rankings
        allQuestionsFromHtml.forEach(question => {
            const voteCountsForQuestion = aggregatedVotes[question];

            // Converte para array de objetos para ordenar
            const sortedResults = Object.entries(voteCountsForQuestion)
                .map(([person, votes]) => ({ person, votes }))
                .sort((a, b) => b.votes - a.votes); // Ordena do maior para o menor

            // Gera o HTML para o ranking de uma pergunta específica
            const questionResultsDiv = document.createElement('div');
            questionResultsDiv.innerHTML = `<h3>${question}</h3>`; // Título da pergunta
            
            let currentRank = 1;
            let lastVotes = -1; // Usado para rastrear empates
            let peopleAtSameRank = 0; // Conta quantas pessoas estão no rank atual

            sortedResults.forEach((item, index) => {
                // Lógica para lidar com empates e pular posições
                if (item.votes !== lastVotes) {
                    currentRank += peopleAtSameRank; // Incrementa o rank pelo número de pessoas no rank anterior
                    peopleAtSameRank = 1; // Reseta para a pessoa atual
                } else {
                    peopleAtSameRank++; // Mais uma pessoa com o mesmo número de votos
                }
                lastVotes = item.votes;

                // Adiciona o item ao HTML do ranking com foto, nome e votos
                // A ordem é: posição, foto, nome, votos
                const personImgSrc = personImages[item.person] || 'https://placehold.co/40x40/cccccc/000000?text=NA'; // Fallback image
                questionResultsDiv.innerHTML += `
                    <div class="ranking-item">
                        <span class="position">${currentRank}º</span> 
                        <img src="${personImgSrc}" alt="${item.person}" class="person-img-results">
                        <div class="person-name-and-votes">
                            <span class="person-name">${item.person}</span>
                            <span class="votes">(${item.votes} votos)</span>
                        </div>
                    </div>
                `;
            });
            resultsContainer.appendChild(questionResultsDiv);
        });

        // Esconde a seção de perguntas e mostra a de resultados
        questionsSection.style.display = 'none';
        resultsSection.style.display = 'block';

    } catch (error) {
        console.error("Erro ao carregar resultados: ", error);
        showAlert('Ocorreu um erro ao carregar os resultados.');
    }
}


// --- Event Listeners para Botões de Navegação ---

// Botão para mostrar os resultados
showResultsBtn.addEventListener('click', displayResults);

// Botão para voltar para a enquete
backToPollBtn.addEventListener('click', () => {
    resultsSection.style.display = 'none';
    questionsSection.style.display = 'block';
    // Se o usuário quiser votar de novo, ele pode. Mas para uma enquete de 5 pessoas,
    // talvez você queira que cada um vote só uma vez.
    // Isso exigiria um controle de sessão ou autenticação do Firebase.
});

// Opcional: Chama displayResults no carregamento para mostrar resultados prévios
// Isso pode ser útil se você quer que os resultados já apareçam ao carregar a página
// Se os usuários puderem ver os resultados antes de votar, pode influenciar os votos.
// Portanto, talvez seja melhor manter essa chamada comentada e usar o botão "Ver Resultados".
// document.addEventListener('DOMContentLoaded', displayResults);


// Opcional: Mostrar os resultados quando a página é carregada (se já houver votos)
// Mas é melhor deixar para o usuário clicar em "Ver Resultados"
// document.addEventListener('DOMContentLoaded', displayResults);
