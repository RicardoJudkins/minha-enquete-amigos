// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
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
const customAlertMessage = document.getElementById('custom-alert-message'); // Corrigido
const closeAlertButton = customAlert.querySelector('.close-button');

// Variável para armazenar os votos temporariamente antes de enviar.
// A chave será o texto da pergunta, e o valor será o nome da pessoa votada.
let userCurrentVotes = {};
// Array de todas as pessoas votáveis (em ordem alfabética)
const people = ["Fernando", "Mayara", "Rafael", "Ricardo", "Samana"];

// Objeto para mapear nomes de pessoas para URLs de imagens
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


// --- Funções de Interação com Firebase ---

// Função para enviar os votos para o Firebase
submitVotesBtn.addEventListener('click', async () => {
    console.log('Botão "Enviar Meus Votos" clicado.'); // Mensagem de depuração
    const allQuestionsElements = document.querySelectorAll('.question-block');
    const totalQuestions = allQuestionsElements.length;
    console.log('Total de perguntas na página:', totalQuestions); // Mensagem de depuração
    console.log('Número de votos registrados:', Object.keys(userCurrentVotes).length); // Mensagem de depuração

    // Verifica se o usuário votou em todas as perguntas
    if (Object.keys(userCurrentVotes).length !== totalQuestions) {
        console.log('Faltam votos. Exibindo alerta.'); // Mensagem de depuração
        showAlert('Por favor, vote em todas as perguntas antes de enviar!');
        return; // Sai da função se nem todas as perguntas foram respondidas
    }

    console.log('Todas as perguntas foram votadas. Prosseguindo com o envio.'); // Mensagem de depuração

    try {
        // Adiciona um novo documento à coleção 'votes'
        await db.collection('votes').add({
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            votes: userCurrentVotes
        });
        console.log('Votos enviados com sucesso para o Firebase.'); // Mensagem de depuração
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
        console.error("Erro ao enviar votos para o Firebase: ", error); // Mensagem de depuração mais específica
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

        questionsSection.style.display = 'none';
        resultsSection.style.display = 'block';

    } catch (error) {
        console.error("Erro ao carregar resultados: ", error);
        showAlert('Ocorreu um erro ao carregar os resultados.');
    }
}


// --- Event Listeners para Botões de Navegação ---

showResultsBtn.addEventListener('click', displayResults);

backToPollBtn.addEventListener('click', () => {
    resultsSection.style.display = 'none';
    questionsSection.style.display = 'block';
});
