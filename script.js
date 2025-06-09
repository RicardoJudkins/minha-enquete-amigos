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

// Para armazenar os votos temporariamente antes de enviar
let userVotes = {};

// Função para manipular cliques nos botões de voto
function handleVoteClick(event) {
    const button = event.target;
    if (button.tagName === 'BUTTON' && button.closest('.options')) {
        const questionDiv = button.closest('section');
        const questionText = questionDiv.querySelector('h2').textContent;
        const selectedPerson = button.dataset.person;

        // Desseleciona outros botões na mesma pergunta
        const buttonsInQuestion = questionDiv.querySelectorAll('.options button');
        buttonsInQuestion.forEach(btn => btn.classList.remove('selected'));

        // Seleciona o botão clicado
        button.classList.add('selected');

        // Armazena o voto
        userVotes[questionText] = selectedPerson;
    }
}

// Adiciona event listener para todos os botões de voto
questionsSection.addEventListener('click', handleVoteClick);

// Função para enviar os votos para o Firebase
submitVotesBtn.addEventListener('click', async () => {
    // Basicamente, cada vez que alguém vota, você cria um novo "documento" no Firestore
    // Esse documento representa o conjunto de votos de UMA PESSOA.
    try {
        await db.collection('votes').add({
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            votes: userVotes
        });
        alert('Seus votos foram enviados com sucesso!');
        // Opcional: Esconder a seção de votação e mostrar resultados
        questionsSection.style.display = 'none';
        await displayResults(); // Mostra os resultados após o envio
        resultsSection.style.display = 'block';
    } catch (error) {
        console.error("Erro ao enviar votos: ", error);
        alert('Ocorreu um erro ao enviar seus votos. Tente novamente.');
    }
});


// Função para obter e exibir os resultados
async function displayResults() {
    resultsContainer.innerHTML = ''; // Limpa resultados anteriores

    const snapshot = await db.collection('votes').get();
    const allVotes = [];
    snapshot.forEach(doc => {
        allVotes.push(doc.data().votes);
    });

    const people = ["Ricardo", "Rafael", "Fernando", "Samana", "Mayara"];
    const questions = Array.from(document.querySelectorAll('#questions-section h2')).map(h2 => h2.textContent);

    questions.forEach(question => {
        const voteCounts = {};
        people.forEach(person => voteCounts[person] = 0); // Inicializa contadores

        allVotes.forEach(userVote => {
            if (userVote[question]) {
                voteCounts[userVote[question]]++;
            }
        });

        // Converte para array de objetos para ordenar
        const sortedResults = Object.entries(voteCounts)
            .map(([person, votes]) => ({ person, votes }))
            .sort((a, b) => b.votes - a.votes); // Ordena do maior para o menor

        // Gera o ranking com empates
        let currentRank = 1;
        let lastVotes = -1; // Para controlar o pulo de posições
        let peopleAtSameRank = 0; // Para contar pessoas com o mesmo número de votos

        const questionResultsDiv = document.createElement('div');
        questionResultsDiv.innerHTML = `<h3>${question}</h3>`;
        
        sortedResults.forEach((item, index) => {
            if (item.votes !== lastVotes) {
                currentRank += peopleAtSameRank;
                peopleAtSameRank = 1;
            } else {
                peopleAtSameRank++;
            }
            lastVotes = item.votes;

            // Formatação do ranking
            questionResultsDiv.innerHTML += `
                <div class="ranking-item">
                    <span class="position">${currentRank}º</span> 
                    <span class="person">${item.person}</span>
                    <span class="votes">(${item.votes} votos)</span>
                </div>
            `;
        });
        resultsContainer.appendChild(questionResultsDiv);
    });
}

// Opcional: Mostrar os resultados quando a página é carregada (se já houver votos)
// Mas é melhor deixar para o usuário clicar em "Ver Resultados"
// document.addEventListener('DOMContentLoaded', displayResults);