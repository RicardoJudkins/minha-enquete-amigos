// Seus detalhes de configuração do Firebase (COLADOS AQUI os valores reais do seu Console do Firebase)
const firebaseConfig = {
    apiKey: "AIzaSyBee0be89eBluIdAZE-TfBE4IENWlFCZCs",
    authDomain: "enqueteamigos.firebaseapp.com",
    projectId: "enqueteamigos",
    storageBucket: "enqueteamigos.firebasestorage.app",
    messagingSenderId: "772234216402",
    appId: "1:772234216402:web:eb1cc498912090903ebe0b"
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
const customAlertMessage = document.getElementById('custom-alert-message');
const closeAlertButton = customAlert.querySelector('.close-button');

// Variável para armazenar os votos temporariamente antes de enviar.
let userCurrentVotes = {};
// Array de todas as pessoas votáveis (em ordem alfabética)
// 'Samara' corrigido aqui
const people = ["Fernando", "Mayara", "Rafael", "Ricardo", "Samara"]; 

// Objeto para mapear nomes de pessoas para URLs de imagens
const personImages = {
    "Fernando": "https://raw.githubusercontent.com/RicardoJudkins/minha-enquete-amigos/main/images/Fernando.jpg",
    "Mayara": "https://raw.githubusercontent.com/RicardoJudkins/minha-enquete-amigos/main/images/Mayara.jpg",
    "Rafael": "https://raw.githubusercontent.com/RicardoJudkins/minha-enquete-amigos/main/images/Rafael.jpg", // Certifique-se que o arquivo existe com esse nome
    "Ricardo": "https://raw.githubusercontent.com/RicardoJudkins/minha-enquete-amigos/main/images/Ricardo.jpg", // Certifique-se que o arquivo existe com esse nome
    "Samara": "https://raw.githubusercontent.com/RicardoJudkins/minha-enquete-amigos/main/images/Samara.jpg" // URL ajustado para Samara.jpg, certifique-se que o arquivo existe com esse nome
};

// --- Funções de UI ---

function showAlert(message) {
    customAlertMessage.textContent = message;
    customAlert.style.display = 'flex';
}

function hideAlert() {
    customAlert.style.display = 'none';
}

closeAlertButton.addEventListener('click', hideAlert);
window.addEventListener('click', (event) => {
    if (event.target === customAlert) {
        hideAlert();
    }
});

// Função para exibir a seção de resultados e esconder a de perguntas
async function showResults() {
    console.log('Exibindo resultados.');
    questionsSection.style.display = 'none';
    resultsSection.style.display = 'block';
    localStorage.setItem('enqueteState', 'results'); // Salva o estado no localStorage
    await displayResults(); // Carrega e exibe os resultados
}

// Função para exibir a seção de perguntas e esconder a de resultados
function showQuestions() {
    console.log('Exibindo perguntas.');
    resultsSection.style.display = 'none';
    questionsSection.style.display = 'block';
    localStorage.setItem('enqueteState', 'questions'); // Salva o estado no localStorage
    // Opcional: limpa as seleções atuais se o usuário voltar para votar novamente
    document.querySelectorAll('.options button').forEach(btn => {
        btn.classList.remove('selected');
    });
    userCurrentVotes = {}; // Limpa os votos temporários
}


// Event listener para manipular cliques nos botões de voto
if (questionsSection) {
    questionsSection.addEventListener('click', (event) => {
        const clickedButton = event.target.closest('button');

        if (clickedButton && clickedButton.closest('.options')) {
            const questionBlock = clickedButton.closest('.question-block');
            const questionText = questionBlock.dataset.question;
            const selectedPerson = clickedButton.dataset.person;

            const buttonsInQuestion = questionBlock.querySelectorAll('.options button');
            buttonsInQuestion.forEach(btn => btn.classList.remove('selected'));

            clickedButton.classList.add('selected');

            userCurrentVotes[questionText] = selectedPerson;
            console.log(`Voto para "${questionText}": ${selectedPerson}`);
        }
    });
} else {
    console.error('Erro: questionsSection não foi encontrado no DOM.');
}


// --- Funções de Interação com Firebase ---

if (submitVotesBtn) {
    submitVotesBtn.addEventListener('click', async () => {
        console.log('Botão "Enviar Meus Votos" clicado.');
        const allQuestionsElements = document.querySelectorAll('.question-block');
        const totalQuestions = allQuestionsElements.length;
        console.log('Total de perguntas na página:', totalQuestions);
        console.log('Número de votos registrados:', Object.keys(userCurrentVotes).length);

        if (Object.keys(userCurrentVotes).length !== totalQuestions) {
            showAlert('Por favor, vote em todas as perguntas antes de enviar!');
            return;
        }

        console.log('Todas as perguntas foram votadas. Prosseguindo com o envio.');

        try {
            await db.collection('votes').add({
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                votes: userCurrentVotes
            });
            console.log('Votos enviados com sucesso para o Firebase.');
            showAlert('Seus votos foram enviados com sucesso!');
            
            // Após enviar, vai para a tela de resultados e salva o estado
            showResults(); 

        } catch (error) {
            console.error("Erro ao enviar votos para o Firebase: ", error);
            showAlert('Ocorreu um erro ao enviar seus votos. Tente novamente.');
        }
    });
} else {
    console.error('Erro: submitVotesBtn não foi encontrado no DOM.');
}

// Botão "Ver Resultados" (agora sempre visível)
if (showResultsBtn) {
    showResultsBtn.addEventListener('click', showResults); // Chama a função showResults
} else {
    console.error('Erro: showResultsBtn não foi encontrado no DOM.');
}

// Botão "Responder Outra Vez" (substitui "Voltar para a Enquete")
if (backToPollBtn) {
    backToPollBtn.addEventListener('click', showQuestions); // Chama a função showQuestions
} else {
    console.error('Erro: backToPollBtn não foi encontrado no DOM.');
}


// Função para obter e exibir os resultados
async function displayResults() {
    resultsContainer.innerHTML = '';

    try {
        const snapshot = await db.collection('votes').get();
        const allIndividualVotes = [];
        snapshot.forEach(doc => {
            allIndividualVotes.push(doc.data().votes);
        });

        const allQuestionsFromHtml = Array.from(document.querySelectorAll('.question-block')).map(div => div.dataset.question);

        const aggregatedVotes = {};
        allQuestionsFromHtml.forEach(q => {
            aggregatedVotes[q] = {};
            people.forEach(p => {
                aggregatedVotes[q][p] = 0;
            });
        });

        allIndividualVotes.forEach(singleUserVotes => {
            for (const question in singleUserVotes) {
                const votedPerson = singleUserVotes[question];
                if (aggregatedVotes[question] && aggregatedVotes[question][votedPerson] !== undefined) {
                    aggregatedVotes[question][votedPerson]++;
                }
            }
        });

        allQuestionsFromHtml.forEach(question => {
            const voteCountsForQuestion = aggregatedVotes[question];

            const sortedResults = Object.entries(voteCountsForQuestion)
                .map(([person, votes]) => ({ person, votes }))
                .sort((a, b) => b.votes - a.votes);

            const questionResultsDiv = document.createElement('div');
            questionResultsDiv.innerHTML = `<h3>${question}</h3>`;
            
            let currentRank = 1;
            let lastVotes = -1;
            let peopleAtSameRank = 0;

            sortedResults.forEach((item, index) => {
                if (item.votes !== lastVotes) {
                    currentRank += peopleAtSameRank;
                    peopleAtSameRank = 1;
                } else {
                    peopleAtSameRank++;
                }
                lastVotes = item.votes;

                const personImgSrc = personImages[item.person] || 'https://placehold.co/40x40/cccccc/000000?text=NA';
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

    } catch (error) {
        console.error("Erro ao carregar resultados: ", error);
        showAlert('Ocorreu um erro ao carregar os resultados.');
    }
}

// Verifica o localStorage ao carregar a página e decide qual seção mostrar
document.addEventListener('DOMContentLoaded', () => {
    const savedState = localStorage.getItem('enqueteState');
    if (savedState === 'results') {
        showResults(); // Se o estado salvo é resultados, exibe os resultados
    } else {
        showQuestions(); // Caso contrário, exibe as perguntas
    }
});
