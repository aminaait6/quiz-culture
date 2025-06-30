// Le script reste globalement le même, mais avec quelques améliorations:
// 1. Ajout d'animations fluides
// 2. Meilleure gestion des transitions entre les écrans
// 3. Optimisation des performances et feedback utilisateur

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('selection-form');
  const quizSection = document.getElementById('quiz-selection');
  const quizCard = document.getElementById('quiz-card');
  const resultsContainer = document.getElementById('results-container');
  const toast = document.querySelector('.toast');
  const toastMessage = document.getElementById('toast-message');
  const toastIcon = document.getElementById('toast-icon');

  // Function to show toast messages
  const showToast = (message, type = 'info') => {
    toastMessage.textContent = message;
    toast.className = `toast show toast-${type}`; // Reset classes and add new ones
    
    // Set icon based on type
    toastIcon.className = 'toast-icon fas';
    if (type === 'success') {
      toastIcon.classList.add('fa-check-circle');
    } else if (type === 'error') {
      toastIcon.classList.add('fa-times-circle');
    } else if (type === 'warning') {
      toastIcon.classList.add('fa-exclamation-triangle');
    } else {
      toastIcon.classList.add('fa-info-circle');
    }

    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000); // Hide after 3 seconds
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const selectedCategory = document.getElementById('category').value;
    const selectedDifficulty = document.getElementById('difficulty').value;

    // Store selections
    sessionStorage.setItem('selectedCategory', selectedCategory);
    sessionStorage.setItem('selectedDifficulty', selectedDifficulty);

    // Animate transition to quiz card
    quizSection.style.opacity = '0';
    quizSection.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
      quizSection.classList.add('hidden'); // Hide selection after animation
      quizCard.classList.remove('hidden'); // Show quiz card
      quizCard.classList.add('show'); // Trigger quiz card entry animation
      
      // Launch quiz with filter
      window.quiz = new QuizApplication(selectedCategory, selectedDifficulty, showToast);
    }, 300); // Match CSS transition duration
  });

  // Add subtle animation to form elements on focus/blur
  const formControls = document.querySelectorAll('.form-control');
  formControls.forEach(control => {
    control.addEventListener('focus', () => {
      control.parentElement.style.transform = 'translateY(-4px)'; // More pronounced lift
      control.parentElement.style.boxShadow = 'var(--shadow-md)';
    });
    
    control.addEventListener('blur', () => {
      control.parentElement.style.transform = 'translateY(0)';
      control.parentElement.style.boxShadow = 'none';
    });
  });

  // Restart button listener (from results screen)
  resultsContainer.querySelector('#restart-btn').addEventListener('click', () => {
    resultsContainer.classList.remove('show');
    resultsContainer.classList.add('hidden');
    quizSection.classList.remove('hidden');
    quizSection.classList.add('show');
    quizSection.style.opacity = '1';
    quizSection.style.transform = 'translateY(0)';
    showToast('Prêt pour un nouveau défi !', 'info');
  });

  // Share button functionality (basic example)
  resultsContainer.querySelector('#share-btn').addEventListener('click', () => {
    const finalScore = document.getElementById('final-score').textContent;
    const finalCorrect = document.getElementById('final-correct').textContent;
    const finalIncorrect = document.getElementById('final-incorrect').textContent;
    const timeTaken = document.getElementById('time-taken').textContent;

    const shareText = `J'ai terminé le quiz QuizMaster avec un score de ${finalScore} ! ${finalCorrect} bonnes réponses et ${finalIncorrect} mauvaises réponses en ${timeTaken}. Venez tester vos connaissances ! #QuizMaster #CultureGenerale`;
    
    // Attempt to use Web Share API first
    if (navigator.share) {
      navigator.share({
        title: 'Mon résultat au QuizMaster !',
        text: shareText,
        url: window.location.href // Or a specific shareable URL
      }).then(() => {
        showToast('Résultats partagés avec succès !', 'success');
      }).catch((error) => {
        console.error('Error sharing:', error);
        showToast('Échec du partage.', 'error');
        // Fallback to copy if Web Share API fails or is not available
        copyResultsToClipboard(shareText);
      });
    } else {
      // Fallback for browsers that don't support Web Share API
      copyResultsToClipboard(shareText);
    }
  });

  function copyResultsToClipboard(resultText) {
    const textArea = document.createElement('textarea');
    textArea.value = resultText;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      showToast('Résultats copiés dans le presse-papiers !', 'success');
    } catch (err) {
      console.error('Failed to copy: ', err);
      showToast('Impossible de copier les résultats.', 'error');
    }
    document.body.removeChild(textArea);
  }
});


class QuizApplication {
  constructor(category = 'culture-generale', difficulty = 'moyen', showToast) {
    this.showToast = showToast; // Pass the toast function

    this.currentQuestion = 0;
    this.score = 0;
    this.correctAnswers = 0;
    this.incorrectAnswers = 0;
    this.selectedAnswer = null;
    this.timeRemaining = 300; // 5 minutes
    this.timer = null;
    this.isAnswered = false;
    this.startTime = null;
    this.questionStartTime = null;

    this.category = category;
    this.difficulty = difficulty;
    this.questions = this.loadQuestionsByCategoryAndDifficulty();
    this.totalQuestions = this.questions.length;

    // DOM Elements
    this.questionTextElement = document.getElementById('question-text');
    this.answerButtonsElement = document.getElementById('answer-buttons');
    this.currentQuestionNumberElement = document.getElementById('current-question-number');
    this.totalQuestionsElement = document.getElementById('total-questions');
    this.progressBarElement = document.getElementById('progress-bar');
    this.scoreElement = document.getElementById('score');
    this.correctCountElement = document.getElementById('correct-count');
    this.incorrectCountElement = document.getElementById('incorrect-count');
    this.timeElement = document.getElementById('time');
    this.resultsContainer = document.getElementById('results-container');
    this.quizCard = document.getElementById('quiz-card'); // Added reference
    this.finalScoreElement = document.getElementById('final-score');
    this.finalCorrectElement = document.getElementById('final-correct');
    this.finalIncorrectElement = document.getElementById('final-incorrect');
    this.timeTakenElement = document.getElementById('time-taken');
    this.checkAnswerBtn = document.getElementById('check-answer-btn');
    this.skipBtn = document.getElementById('skip-btn');

    this.setupEventListeners();
    this.startQuiz();
  }

  // Quiz data - Professional questions organized by category and difficulty
  questionData = {
    'culture-generale': {
      'facile': [
        {
          question: "Quelle est la capitale de la France ?",
          answers: ["Berlin", "Madrid", "Paris", "Rome"],
          correct: "Paris",
        },
        {
          question: "Qui a écrit 'Le Petit Prince' ?",
          answers: ["Victor Hugo", "Albert Camus", "Antoine de Saint-Exupéry", "Marcel Pagnol"],
          correct: "Antoine de Saint-Exupéry",
        },
        {
          question: "Combien de continents y a-t-il sur Terre ?",
          answers: ["5", "6", "7", "8"],
          correct: "7",
        },
         {
          question: " Quel est l'élément chimique représenté par le symbole (O) ?",
          answers: ["Oxygène", "Or", "Osmium", "Oganesson"],
          correct: "Oxygène",
        },
         {
          question: " Quel est le plus grand océan du monde ?", // Corrected duplicate "Quel est"
          answers: ["Atlantique", "Indien", "Arctique", "Pacifique"],
          correct: "Pacifique",
        },
         {
          question: " Quelle langue est la plus parlée au monde ?", // Corrected lowercase "quelle"
          answers: ["Anglais", "Mandarin", "Chinois", "Arabe"], // Capitalized "Chinois"
          correct: "Mandarin",
        },
         {
          question: " Dans quel pays se trouve la pyramide de Khéops ?",
          answers: ["Egypte", "Grèce", "Mexique", "Italie"],
          correct: "Egypte",
        },
         {
          question: " Quelle planète est la plus proche du Soleil ?",
          answers: ["Mercure", "Vénus", "Terre", "Mars"],
          correct: "Mercure",
        },
         {
          question: " Dans quel pays se trouve la Tour de Pise ?",
          answers: ["Italie", "France", "Espagne", "Portugal"],
          correct: "Italie",
        },
         {
          question: " Quel est le pays d’origine du sushi ?",
          answers: ["Italie", "France", "Espagne", "Japon"],
          correct: "Japon",
        }
      ],
      'moyen': [
        {
          question: "Quel est le plus long fleuve du monde ?",
          answers: ["Le Nil", "L'Amazone", "Le Yangtsé", "Le Mississippi"],
          correct: "L'Amazone",
        },
        {
          question: "Qui a peint la Joconde ?",
          answers: ["Vincent van Gogh", "Pablo Picasso", "Léonard de Vinci", "Claude Monet"],
          correct: "Léonard de Vinci",
        },
        {
          question: "Dans quel pays se trouve le mont Everest ?",
          answers: ["Chine", "Inde", "Népal", "Bhoutan"],
          correct: "Népal",
        },
        {
          question: "En quelle année a eu lieu la Révolution française ?",
          answers: ["1789", "1792", "1794", "1804"],
          correct: "1789",
        },
         {
          question: "Quel est le nom du président américain assassiné en 1963 ?",
          answers: ["John F. Kennedy", "Lyndon B. Johnson", "Richard Nixon", "Dwight D. Eisenhower"],
          correct: "John F. Kennedy",
        },
         {
          question: "Qui a écrit Les Misérables ?", // Corrected leading dot
          answers: ["Victor Hugo", "Gustave Flaubert", "Emile Zola", "Honoré de Balzac"],
          correct: "Victor Hugo",
        },
         {
          question: "Quel est le pays le plus peuplé d’Afrique ?",
          answers: ["Nigeria", "Egypte", "Afrique du Sud", "Ethiopie"],
          correct: "Nigeria",
        },
         {
          question: " Quelle planète est surnommée “la planète rouge” ?",
          answers: ["Mars", "Vénus", "Jupiter", "Saturne"],
          correct: "Mars",
        },
         {
          question: "Quel pays a remporté la Coupe du monde de football en 2018 ?",
          answers: ["France", "Brésil", "Allemagne", "Argentine"],
          correct: "France",
        },
         {
          question: "Quelle est la langue officielle du Brésil ?",
          answers: ["Portugais", "Espagnol", "Anglais", "Français"],
          correct: "Portugais",
        },
         {
          question: " Quelle est la monnaie utilisée au Japon ?",
          answers: ["Yen", "Won", "Dollar", "Euro"],
          correct: "Yen",
        },
      ],
      'difficile': [
        {
          question: "Quelle est la capitale de l'Australie ?",
          answers: ["Sydney", "Melbourne", "Canberra", "Perth"],
          correct: "Canberra",
        },
        {
          question: "Quel est le nom de la galaxie dans laquelle se trouve notre système solaire ?",
          answers: ["Andromède", "Voie lactée", "Triangulum", "Centaurus A"],
          correct: "Voie lactée",
        },
        {
          question: "Quel traité a mis fin à la Première Guerre mondiale ?", // Corrected extra space
          answers: ["Traité de Versailles", "Traité de Tordesillas", "Traité de Paris", "Traité de Maastricht"], // Corrected extra space
          correct: "Traité de Versailles",
        },
         {
          question: "Quel est le nom du mathématicien connu pour son théorème sur les triangles rectangles ?", // Corrected extra space
          answers: ["Pythagore", "Euclide", "Archimède", "Descartes"],
          correct: "Pythagore",
        },
        {
          question: "Quelle est la plus grande lune de Saturne ?", // Corrected extra space
          answers: ["Titan", "Rhea", "Encelade", "Mimas"],
          correct: "Titan",
        },
         {
          question: "Quel auteur russe a écrit Guerre et Paix ?", // Corrected extra space
          answers: ["Léon Tolstoï", "Fiodor Dostoïevski", "Anton Tchekhov", "Maxime Gorki"],
          correct: "Léon Tolstoï",
        },
         {
          question: "Quel physicien a découvert la radioactivité naturelle ?", // Corrected extra space
          answers: ["Marie Curie", "Albert Einstein", "Isaac Newton", "Niels Bohr"],
          correct: "Henri Becquerel",
        },
         {
          question: "Quel est le principal gaz responsable de l’effet de serre ?", // Corrected extra space
          answers: ["Dioxyde de carbone", "Méthane", "Protoxyde d'azote", "Vapeur d'eau"],
          correct: "Dioxyde de carbone",
        },
         {
          question: "Quelle est la capitale de la Mongolie ?", // Corrected duplicate answers
          answers: ["Oulan-Bator", "Ulaanbaatar", "Noursoultan", "Bichkek"], // Changed options to avoid duplicates, keep Ulaanbaatar correct
          correct: "Ulaanbaatar",
        },
         {
          question: "Qui a écrit À la recherche du temps perdu ?",
          answers: ["Marcel Proust", "Victor Hugo", "Gustave Flaubert", "Émile Zola"],
          correct: "Marcel Proust",
        },
      ]
    },
    'cuisine': {
      'facile': [
        {
          question: "Quel est l'ingrédient principal de la guacamole ?",
          answers: ["Tomate", "Avocat", "Oignon", "Citron vert"],
          correct: "Avocat",
        },
         {
          question: "Quelle pâte est utilisée pour faire un mille-feuille ?",
          answers: ["Pâte brisée", "Pâte feuilletée", "Pâte sablée", "Pâte à choux"],
          correct: "Pâte feuilletée",
        },
        {
          question: "Quel plat est traditionnellement associé à l'Italie ?",
          answers: ["Sushi", "Tacos", "Pizza", "Curry"],
          correct: "Pizza",
        },
        {
          question: "Quel fruit est utilisé pour faire du jus d'orange ?",
          answers: ["Pomme", "Banane", "Orange", "Raisin"],
          correct: "Orange",
        },
         {
          question:  "Quelle boisson est faite à base de grains de café ?",
          answers: ["Café", "Thé", "Chocolat", "Jus d'orange"],
          correct: "Café",
        },
         {
          question: "Quel ustensile de cuisine sert à mélanger et battre les ingrédients ?", // Corrected extra space
          answers: ["Fouet", "Spatule", "Casserole", "Passoire"],
          correct: "Fouet",
        },
         {
          question: " Quel légume est à la base du potage appelé “potage Saint-Germain” ?",
          answers: ["Poireau", "Carotte", "Pomme de terre", "Céleri"],
          correct: "Poireau",
        },
         {
          question: "Quel fromage est traditionnellement utilisé dans une pizza Margherita ?",
          answers: ["Mozzarella", "Cheddar", "Parmesan", "Feta"],
          correct: "Mozzarella",
        },
         {
          question: "Quelle céréale est utilisée pour faire du pain ?", // Corrected extra space
          answers: ["Blé", "Riz", "Maïs", "Orge"],
          correct: "Blé",
        },
         {
          question: "Quelle épice est rouge et piquante ?",
          answers: ["Paprika", "Cumin", "Curcuma", "Coriandre"],
          correct: "Paprika",
        }
      ],
      'moyen': [
        {
          question: "Quel est le principal ingrédient du Tiramisu ?",
          answers: ["Mascarpone", "Ricotta", "Fromage frais", "Crème fraîche"],
          correct: "Mascarpone",
        },
        {
          question: "De quel pays est originaire le plat 'Paella' ?",
          answers: ["France", "Espagne", "Portugal", "Grèce"],
          correct: "Espagne",
        },
       {
          question: "Quel pays est l’origine du fromage Emmental ?",
          answers: ["France", "Espagne", "Portugal", "Suisse"],
          correct: "Suisse",
        },
        {
          question: "Quelle herbe aromatique est la base du pesto traditionnel italien ?", // Corrected extra space
          answers: ["Basilic", "Persil", "Coriandre", "Thym"],
          correct: "Basilic",
        },
        {
          question: "Quel plat est typiquement cuisiné dans un tajine ?",
          answers: ["Couscous", "Ratatouille", "Boeuf bourguignon", "Tajine de poulet"],
          correct: "Tajine de poulet",
        },
        {
          question: "Quelle est la différence entre une confiture et une gelée ?",
          answers: ["La confiture contient des morceaux de fruits", "La gelée est plus sucrée", "La confiture est faite avec des agrumes", "La gelée est toujours rouge"],
          correct: "La confiture contient des morceaux de fruits",
        },
        {
          question: "Quel est l’ingrédient principal du houmous ?", // Corrected extra space
          answers: ["Pois chiches", "Lentilles", "Haricots rouges", "Fèves"],
          correct: "Pois chiches",
        },
        {
          question: "Quel dessert français est composé de pâte à choux garnie de crème et souvent glacé ?",
          answers: ["Éclair", "Tarte Tatin", "Mille-feuille", "Macaron"],
          correct: "Éclair",
        },
        {
          question: "Quelle épice est souvent utilisée dans les plats indiens pour sa couleur jaune ?", // Corrected extra space
          answers: ["Safran", "Curcuma", "Paprika", "Coriandre"],
          correct: "Curcuma",
        },
        {
          question: "Quelle est la température moyenne du four pour faire cuire un gâteau ?",
          answers: ["180°C", "200°C", "220°C", "160°C"],
          correct: "180°C",
        },
      ],
      'difficile': [
        {
          question: "Quelle est la particularité du 'Miso' dans la cuisine japonaise ?",
          answers: ["C'est une sauce soja", "C'est une pâte de haricots fermentés", "C'est un type de riz", "C'est une algue"],
          correct: "C'est une pâte de haricots fermentés",
        },
        {
          question: " Quelle est la température idéale pour faire fondre du chocolat noir au bain-marie sans le brûler?",
          answers: ["50°C", "60°C", "70°C", "80°C"],
          correct: "50°C",
        },
        {
          question: "Quel est le nom de la technique de cuisson rapide des légumes à feu vif dans la cuisine asiatique ?",
          answers: ["Braisage", "Friture", "Sautage (Stir-fry)", "Pochage"],
          correct: "Sautage (Stir-fry)",
        },
        {
          question: "Quelle est la différence principale entre une pâte brisée et une pâte sablée ?",
          answers: ["La pâte brisée est plus sucrée", "La pâte sablée contient des œufs", "La pâte brisée est plus friable", "La pâte sablée est plus épaisse"],
          correct: "La pâte brisée est plus friable",
        },
        {
          question: "Le 'nappage à la nappe' est utilisé pour vérifier ?",
          answers: [" Le croustillant de la pâte", "Le goût du bouillon", "Le dosage du sucre", "L’onctuosité de la crème anglaise"],
          correct: "L’onctuosité de la crème anglaise",
        },
        {
          question: "Quel est le nom du champignon utilisé dans la fabrication de la truffe noire du Périgord ?",
          answers: ["Tuber melanosporum", "Agaricus bisporus", "Lactarius deliciosus", "Cantharellus cibarius"],
          correct: "Tuber melanosporum",
        },
        {
          question: "Le tamari est une sauce japonaise qui diffère de la sauce soja car elle ?",
          answers: ["Est sans gluten", "Est plus salée", "Contient des algues", "Est sucrée"],
          correct: "Est sans gluten",
        },
        {
          question: "Quelle est la particularité d’un œuf parfait ? ",
          answers: ["Il est cuit au four", " Il est cuit à 64°C pendant une heure ", " Il est cru", "Il est cuit dans du sel"],
          correct: "Il est cuit à 64°C pendant une heure ",
        },
        {
          question: "Quel est le nom de la technique de cuisson rapide des légumes à feu vif dans la cuisine asiatique ?", // Duplicate question, keeping both as per request to keep questions
          answers: ["Braisage", "Friture", "Sautage (Stir-fry)", "Pochage"],
          correct: "Sautage (Stir-fry)",
        },
        {
          question: "Quel est le nom de la technique de cuisson rapide des légumes à feu vif dans la cuisine asiatique ?", // Duplicate question, keeping both as per request to keep questions
          answers: ["Braisage", "Friture", "Sautage (Stir-fry)", "Pochage"],
          correct: "Sautage (Stir-fry)",
        },
      ]
    },
    'web-dev': {
      'facile': [
        {
          question: "Quel langage est utilisé pour structurer le contenu d'une page web ?",
          answers: ["CSS", "JavaScript", "HTML", "Python"],
          correct: "HTML",
        },
        {
          question: "Quel est l'acronyme de 'Cascading Style Sheets' ?",
          answers: ["JS", "HTML", "CSS", "XML"],
          correct: "CSS",
        },
        {
          question: "Quel navigateur web est développé par Google ?",
          answers: ["Firefox", "Safari", "Edge", "Chrome"],
          correct: "Chrome",
        },
         {
          question: "Que signifie HTML ?",
          answers: ["HyperText Markup Language", "HighText Machine Language", "HyperTabular Markup Language", "None of the above"],
          correct: "HyperText Markup Language",
        },
         {
          question: " À quoi sert la balise <a> en HTML ?",
          answers: ["Créer des liens", "Mettre en forme du texte", "Insérer des images", "Définir des sections"],
          correct: "Créer des liens",
        },
        {
          question: "Quelle propriété CSS permet de changer la couleur du texte ?", // Corrected extra space
          answers: ["color", "background-color", "font-size", "text-align"],
          correct: "color",
        },
        {
          question: "En JavaScript, quelle commande affiche un message dans la console ?",
          answers: ["console.log()", "print()", "echo()", "log.console()"],
          correct: "console.log()",
        },
        {
          question: "Que signifie 'front-end' ?", // Corrected extra space
          answers: ["Interface utilisateur", "Serveur", "Base de données", "API"],
          correct: "Interface utilisateur",
        },
        {
          question: "Que fait une base de données dans une application web ?",
          answers: ["Stocke les données", "Affiche les pages", "Gère les utilisateurs", "Traite les paiements"],
          correct: "Stocke les données",
        },
         {
          question: "Quel navigateur web est développé par Google ?", // Duplicate question, keeping both
          answers: ["Firefox", "Safari", "Edge", "Chrome"],
          correct: "Chrome",
        },
      ],
      'moyen': [
        {
          question: "Quel est le rôle principal de JavaScript dans le développement web ?",
          answers: ["Styliser les pages", "Gérer les bases de données", "Ajouter de l'interactivité", "Créer des serveurs"],
          correct: "Ajouter de l'interactivité",
        },
        {
          question: "Quel est l'outil le plus couramment utilisé pour le contrôle de version en développement web ?",
          answers: ["FTP", "HTTP", "Git", "SSH"],
          correct: "Git",
        },
        {
          question: "Dans une base de données relationnelle, qu’est-ce qu’une clé primaire ?", // Corrected extra space
          answers: ["Une colonne facultative", "Un identifiant unique pour chaque enregistrement", "Une valeur de tri", "Un mot de passe"], // Corrected typo in "enregistremen"
          correct: "Un identifiant unique pour chaque enregistrement",
        },
        {
          question: "Quelle balise HTML5 permet d’intégrer du son ?",
          answers: ["<sound>", "<audio>", "<media>", "<track>"],
          correct: "<audio>",
        },
        {
          question: "Qu’est-ce que le DOM en JavaScript ?",
          answers: ["Un serveur web", "Une base de données", "Une interface pour manipuler les éléments HTML", "Une bibliothèque CSS"],
          correct: "Une interface pour manipuler les éléments HTML",
        },
        {
          question: "Que fait une requête SQL de type JOIN ?",
          answers: [" Supprime une table", "Crée une table temporaire", "Combine les données de plusieurs tables ", "Trie les données/IP"],
          correct: "Combine les données de plusieurs tables ",
        },
        {
          question: "Quel protocole est utilisé pour transférer des pages web sur Internet ?",
          answers: ["FTP", "SMTP", "HTTP", "TCP/IP"],
          correct: "HTTP",
        },
        {
          question: " Quel rôle joue Express.js dans une application Node.js ?", // Corrected extra space
          answers: ["C’est une base de données", "Un langage de programmation", "Un framework pour créer des serveurs et des routes", "Un moteur de rendu graphique/IP"],
          correct: "Un framework pour créer des serveurs et des routes",
        },
        {
          question: "Quelle est la structure correcte d’une requête HTTP GET ?",
          answers: ["Elle contient un corps (body)", " Elle est envoyée au serveur pour obtenir des données", " Elle supprime une ressource", "Elle envoie des données via un formulaire"],
          correct: " Elle est envoyée au serveur pour obtenir des données",
        },
        {
          question: "À quoi sert une API REST ?",
          answers: ["Transférer des fichiers", "Gérer les utilisateurs", "Faciliter la communication entre applications", "Stocker des données"],
          correct: "Faciliter la communication entre applications",
        },
        {
          question: "Quelle commande Git permet de récupérer les modifications d’un dépôt distant ?",
          answers: ["git pull", "git push", "git clone", "git fetch"],
          correct: "git pull",
        },
        {
          question: "Que signifie CRUD en base de données ?",
          answers: ["Créer, Lire, Mettre à jour, Supprimer", "Transférer, Stocker, Sécuriser, Analyser", "Filtrer, Trier, Regrouper, Afficher", "Importer, Exporter, Sauvegarder, Restaurer"],
          correct: "Créer, Lire, Mettre à jour, Supprimer",
        }
      ],
      'difficile': [
        {
          question: "Qu'est-ce qu'un 'framework' JavaScript ?",
          answers: ["Une bibliothèque de fonctions", "Un ensemble de règles CSS", "Une architecture pré-établie pour le développement d'applications", "Un outil de débogage"],
          correct: "Une architecture pré-établie pour le développement d'applications",
        },
        {
          question: "Quelle est la différence entre 'let', 'const' et 'var' en JavaScript ?",
          answers: ["Leur portée d'application", "Leur performance", "Leur type de données", "Leur utilisation en asynchrone"],
          correct: "Leur portée d'application",
        },
        {
          question: "Qu'est-ce que le 'DOM' en développement web ?",
          answers: ["Une base de données", "Un langage de balisage", "Une interface de programmation pour les documents HTML et XML", "Un serveur web"],
          correct: "Une interface de programmation pour les documents HTML et XML",
        },
        {
          question: "Que permet le protocole HTTPS par rapport au HTTP classique ?",
          answers: ["Compresser les pages", "Accélérer les requêtes", "Chiffrer les échanges entre client et serveur", "Supprimer les cookies"],
          correct: "Chiffrer les échanges entre client et serveur",
        },
        {
          question: "Que fait une attaque XSS (Cross Site Scripting) ?",
          answers: ["Elle injecte du CSS dans une page", "Elle force le téléchargement de fichiers", "Elle injecte du JavaScript malveillant dans une page web", "Elle bloque l’accès à une API"],
          correct: "Elle injecte du JavaScript malveillant dans une page web",
        },
        {
          question: "Quel est le rôle du middleware dans une application Express.js ?",
          answers: ["Générer du HTML", "Gérer les bases de données", "Intercepter et modifier les requêtes/réponses entre client et serveur", " Compiler le code JS"],
          correct: "Intercepter et modifier les requêtes/réponses entre client et serveur",
        },
        {
          question: "Que signifie 'SPA' dans le développement web ?",
          answers: [" Simple PHP Architecture", " Secure Page Access", "Single Page Application ", "Static Page Algorithm"],
          correct: "Single Page Application ",
        },
        {
          question: "Quelle est la différence entre 'let', 'const' et 'var' en JavaScript ?", // Duplicate question, keeping both
          answers: ["Leur portée d'application", "Leur performance", "Leur type de données", "Leur utilisation en asynchrone"],
          correct: "Leur portée d'application",
        },
        {
          question: "Qu'est-ce qu'un token JWT (JSON Web Token) ?",
          answers: ["Un identifiant de session chiffré", "Un protocole réseau", " Un fichier JavaScript", "Un mot de passe crypté"],
          correct: "Un identifiant de session chiffré",
        },
        {
          question: "Quelle est la différence entre SSR (Server-Side Rendering) et CSR (Client-Side Rendering)?",
          answers: ["CSR est plus lent dans tous les cas", "SSR rend le HTML côté serveur, CSR dans le navigateur ", " CSR nécessite une base de données", "SSR utilise uniquement HTML statique"],
          correct: "SSR rend le HTML côté serveur, CSR dans le navigateur ",
        }
      ]
    },
   'football': {
  'facile': [
    {
      question: "Qui est surnommé 'CR7' ?",
      answers: ["Messi", "Mbappé", "Cristiano Ronaldo", "Neymar"],
      correct: "Cristiano Ronaldo"
    },
    {
      question: "Quel pays a gagné la Coupe du monde 2018 ?",
      answers: ["Allemagne", "France", "Brésil", "Italie"],
      correct: "France"
    },
    {
      question: "Combien de joueurs sur le terrain par équipe ?",
      answers: ["9", "10", "11", "12"],
      correct: "11"
    },
    {
      question: "Quel pays a organisé la Coupe du monde 2022 ?",
      answers: ["Qatar", "Russie", "Japon", "Espagne"],
      correct: "Qatar"
    },
    {
      question: "Quelle partie du corps ne peut pas toucher le ballon ? (hors gardien)",
      answers: ["Pied", "Poitrine", "Main", "Tête"],
      correct: "Main"
    },
    {
      question: "Quel est le surnom de Lionel Messi ?",
      answers: ["La Pulga", "El Tigre", "Le Roi", "L'Aigle"],
      correct: "La Pulga"
    },
    {
      question: "Quel club est basé à Barcelone ?",
      answers: ["Real Madrid", "Atlético", "FC Barcelone", "Sevilla"],
      correct: "FC Barcelone"
    },
    {
      question: "Quel joueur a porté le numéro 10 du Brésil ?",
      answers: ["Zidane", "Neymar", "Ronaldo", "Salah"],
      correct: "Ronaldo"
    },
    {
      question: "Que signifie 'VAR' ?",
      answers: ["Vidéo Assistant Referee", "Vitesse d'Attaque Rapide", "Valeur Athlétique Réduite", "Vision Alignée Rapide"],
      correct: "Vidéo Assistant Referee"
    },
    {
      question: "Quelle couleur a un carton d'avertissement ?",
      answers: ["Rouge", "Bleu", "Jaune", "Vert"],
      correct: "Jaune"
    }
  ],
  'moyen': [
    {
      question: "Quel club a gagné le plus de Ligues des Champions ?",
      answers: ["Milan AC", "Barça", "Real Madrid", "Bayern"],
      correct: "Real Madrid"
    },
    {
      question: "Qui a marqué la 'main de Dieu' en 1986 ?",
      answers: ["Pelé", "Ronaldo", "Maradona", "Zidane"],
      correct: "Maradona"
    },
    {
      question: "Quel poste occupe généralement un gardien ?",
      answers: ["Défenseur", "Milieu", "Attaquant", "Goal"],
      correct: "Goal"
    },
    {
      question: "Que signifie 'hat-trick' ?",
      answers: ["3 passes", "3 tirs", "3 arrêts", "3 buts"],
      correct: "3 buts"
    },
    {
      question: "En quelle année la France a-t-elle gagné sa première Coupe du monde ?",
      answers: ["1998", "2002", "1986", "2018"],
      correct: "1998"
    },
    {
      question: "Qui a entraîné Liverpool pendant la décennie 2020 ?",
      answers: ["Guardiola", "Tuchel", "Klopp", "Mourinho"],
      correct: "Klopp"
    },
    {
      question: "Dans quel pays joue le club 'Ajax' ?",
      answers: ["Belgique", "Pays-Bas", "Allemagne", "Suède"],
      correct: "Pays-Bas"
    },
    {
      question: "Quel trophée est attribué au meilleur buteur ?",
      answers: ["Ballon d'Or", "Gant d'Or", "Soulier d'Or", "Trophée FIFA"],
      correct: "Soulier d'Or"
    },
    {
      question: "Combien de temps dure un match (hors prolongation) ?",
      answers: ["60min", "75min", "90min", "120min"],
      correct: "90min"
    },
    {
      question: "Quel club portugais a révélé Cristiano Ronaldo ?",
      answers: ["Porto", "Sporting", "Benfica", "Braga"],
      correct: "Sporting"
    }
  ],
  'difficile': [
    {
      question: "Quel gardien a remporté le Ballon d'Or ?",
      answers: ["Buffon", "Neuer", "Yachine", "Casillas"],
      correct: "Yachine"
    },
    {
      question: "Combien de buts Klose a-t-il inscrits en Coupe du monde ?",
      answers: ["14", "15", "16", "17"],
      correct: "16"
    },
    {
      question: "En quelle année ont été introduits les cartons rouges ?",
      answers: ["1970", "1966", "1982", "1990"],
      correct: "1970"
    },
    {
      question: "Quel pays a remporté l'Euro 2004 ?",
      answers: ["France", "Grèce", "Espagne", "Allemagne"],
      correct: "Grèce"
    },
    {
      question: "Qui a marqué en finale du Mondial 2006 contre la France (tir au but vainqueur) ?",
      answers: ["Pirlo", "Totti", "Grosso", "Del Piero"],
      correct: "Grosso"
    },
    {
      question: "Quel joueur détient le record du plus grand nombre de sélections nationales ?",
      answers: ["Ronaldo", "Buffon", "Ramos", "Cristiano Ronaldo"],
      correct: "Cristiano Ronaldo"
    },
    {
      question: "Quel club a gagné la Ligue des Champions en 2005 après une remontée mythique ?",
      answers: ["Chelsea", "Milan", "Liverpool", "Barcelone"],
      correct: "Liverpool"
    },
    {
      question: "En quelle année a eu lieu la première Coupe du monde ?",
      answers: ["1930", "1924", "1940", "1934"],
      correct: "1930"
    },
    {
      question: "Qui a remporté le Ballon d'Or 2006 ?",
      answers: ["Cannavaro", "Zidane", "Ronaldinho", "Henry"],
      correct: "Cannavaro"
    },
    {
      question: "Quel est le seul pays à avoir participé à toutes les Coupes du monde ?",
      answers: ["Allemagne", "France", "Brésil", "Italie"],
      correct: "Brésil"
    }
  ]
},
     'histoire': {
  'facile': [
    {
      question: "Qui a découvert l'Amérique en 1492 ?",
      answers: ["Marco Polo", "Christophe Colomb", "Magellan", "Vasco de Gama"],
      correct: "Christophe Colomb"
    },
    {
      question: "Quel roi de France a été surnommé le Roi Soleil ?",
      answers: ["Louis XIV", "Louis XVI", "François Ier", "Napoléon"],
      correct: "Louis XIV"
    },
    {
      question: "Dans quel pays a eu lieu la Révolution industrielle ?",
      answers: ["Allemagne", "États-Unis", "France", "Royaume-Uni"],
      correct: "Royaume-Uni"
    },
    {
      question: "Quelle muraille célèbre se trouve en Chine ?",
      answers: ["Mur d'Hadrien", "Mur de Berlin", "Grande Muraille", "Mur des Lamentations"],
      correct: "Grande Muraille"
    },
    {
      question: "Quel était le nom de l'empereur français couronné en 1804 ?",
      answers: ["Louis XVI", "Napoléon Bonaparte", "Charlemagne", "Robespierre"],
      correct: "Napoléon Bonaparte"
    },
    {
      question: "Qui était le premier président des États-Unis ?",
      answers: ["George Washington", "Abraham Lincoln", "Thomas Jefferson", "John Adams"],
      correct: "George Washington"
    },
    {
      question: "En quelle année la Seconde Guerre mondiale a-t-elle commencé ?",
      answers: ["1914", "1939", "1945", "1929"],
      correct: "1939"
    },
    {
      question: "Quelle ville a été bombardée en 1945 par les États-Unis ?",
      answers: ["Tokyo", "Hiroshima", "Séoul", "Manille"],
      correct: "Hiroshima"
    },
    {
      question: "Quelle civilisation a construit les pyramides ?",
      answers: ["Les Grecs", "Les Romains", "Les Égyptiens", "Les Mayas"],
      correct: "Les Égyptiens"
    },
    {
      question: "Quel pays a construit le Mur de Berlin ?",
      answers: ["URSS", "États-Unis", "RFA", "France"],
      correct: "URSS"
    }
  ],
  'moyen': [
    {
      question: "Qui a été guillotiné pendant la Révolution française ?",
      answers: ["Napoléon", "Louis XVI", "Robespierre", "Voltaire"],
      correct: "Louis XVI"
    },
    {
      question: "Quel traité a mis fin à la Première Guerre mondiale ?",
      answers: ["Traité de Paris", "Traité de Rome", "Traité de Versailles", "Traité de Vienne"],
      correct: "Traité de Versailles"
    },
    {
      question: "Quelle reine est célèbre pour avoir dit 'Qu’ils mangent de la brioche' ?",
      answers: ["Élisabeth I", "Marie-Antoinette", "Catherine de Médicis", "Anne d’Autriche"],
      correct: "Marie-Antoinette"
    },
    {
      question: "Quel empire a été fondé par Gengis Khan ?",
      answers: ["Empire Ottoman", "Empire Perse", "Empire Mongol", "Empire Romain"],
      correct: "Empire Mongol"
    },
    {
      question: "Quel événement a déclenché la Première Guerre mondiale ?",
      answers: ["La chute de Napoléon", "L’assassinat de l’archiduc François-Ferdinand", "L'invasion de la Pologne", "La bataille de Verdun"],
      correct: "L’assassinat de l’archiduc François-Ferdinand"
    },
    {
      question: "Quand a eu lieu la Révolution russe ?",
      answers: ["1789", "1917", "1945", "1968"],
      correct: "1917"
    },
    {
      question: "Quel président américain a aboli l’esclavage ?",
      answers: ["George Washington", "Theodore Roosevelt", "Abraham Lincoln", "Franklin D. Roosevelt"],
      correct: "Abraham Lincoln"
    },
    {
      question: "Quelle civilisation a inventé la démocratie ?",
      answers: ["Les Romains", "Les Grecs", "Les Perses", "Les Égyptiens"],
      correct: "Les Grecs"
    },
    {
      question: "En quelle année est tombé le Mur de Berlin ?",
      answers: ["1989", "1991", "1975", "1961"],
      correct: "1989"
    },
    {
      question: "Qui était Cléopâtre ?",
      answers: ["Une impératrice romaine", "Une pharaonne égyptienne", "Une reine grecque", "Une prêtresse sumérienne"],
      correct: "Une pharaonne égyptienne"
    }
  ],
  'difficile': [
    {
      question: "Qui a écrit *Le Prince*, traité politique célèbre de la Renaissance ?",
      answers: ["Machiavel", "Rousseau", "Descartes", "Voltaire"],
      correct: "Machiavel"
    },
    {
      question: "Quel roi a instauré l’édit de Nantes en 1598 ?",
      answers: ["Louis XIII", "Louis XIV", "Henri IV", "François Ier"],
      correct: "Henri IV"
    },
    {
      question: "Quelle bataille marque la fin de Napoléon en 1815 ?",
      answers: ["Austerlitz", "Iéna", "Trafalgar", "Waterloo"],
      correct: "Waterloo"
    },
    {
      question: "Quel était le nom de code du débarquement en Normandie ?",
      answers: ["Opération Torch", "Opération Overlord", "Opération Market Garden", "Opération Barbarossa"],
      correct: "Opération Overlord"
    },
    {
      question: "Qui a été le dernier tsar de Russie ?",
      answers: ["Alexandre III", "Nicolas II", "Pierre le Grand", "Ivan le Terrible"],
      correct: "Nicolas II"
    },
    {
      question: "Quel empire est tombé en 1453 ?",
      answers: ["Empire Perse", "Empire Mongol", "Empire Byzantin", "Empire Carolingien"],
      correct: "Empire Byzantin"
    },
    {
      question: "Quel philosophe a influencé la Révolution française avec le *Contrat social* ?",
      answers: ["Platon", "Locke", "Voltaire", "Rousseau"],
      correct: "Rousseau"
    },
    {
      question: "Quel général carthaginois a traversé les Alpes avec des éléphants ?",
      answers: ["Scipion", "Alexandre", "Hannibal", "Attila"],
      correct: "Hannibal"
    },
    {
      question: "Quel événement a eu lieu le 14 juillet 1789 ?",
      answers: ["La fuite à Varennes", "La prise de la Bastille", "La mort de Louis XVI", "Le sacre de Napoléon"],
      correct: "La prise de la Bastille"
    },
    {
      question: "Quelle est la date officielle de la fin de la Seconde Guerre mondiale en Europe ?",
      answers: ["1er septembre 1939", "8 mai 1945", "2 septembre 1945", "6 juin 1944"],
      correct: "8 mai 1945"
    }
  ]
},
    'geographie': {
  'facile': [
    {
      question: "Quel est le plus grand continent ?",
      answers: ["Afrique", "Asie", "Europe", "Amérique du Nord"],
      correct: "Asie"
    },
    {
      question: "Quelle est la capitale de la France ?",
      answers: ["Londres", "Madrid", "Paris", "Rome"],
      correct: "Paris"
    },
    {
      question: "Quel océan borde l'Algérie ?",
      answers: ["Océan Atlantique", "Océan Pacifique", "Océan Indien", "Aucun"],
      correct: "Aucun"
    },
    {
      question: "Quel est le plus long fleuve du monde ?",
      answers: ["Nil", "Mississippi", "Amazon", "Yangtsé"],
      correct: "Amazon"
    },
    {
      question: "Dans quel pays se trouve la Tour Eiffel ?",
      answers: ["Espagne", "Italie", "France", "Allemagne"],
      correct: "France"
    },
    {
      question: "Quel est le désert le plus vaste du monde ?",
      answers: ["Sahara", "Gobi", "Kalahari", "Arctique"],
      correct: "Sahara"
    },
    {
      question: "Combien y a-t-il de continents ?",
      answers: ["5", "6", "7", "8"],
      correct: "7"
    },
    {
      question: "Quel est le plus grand océan ?",
      answers: ["Atlantique", "Indien", "Arctique", "Pacifique"],
      correct: "Pacifique"
    },
    {
      question: "Quel est le pays le plus peuplé au monde ?",
      answers: ["États-Unis", "Inde", "Chine", "Russie"],
      correct: "Chine"
    },
    {
      question: "Quel pays est en forme de botte ?",
      answers: ["Espagne", "Italie", "Grèce", "Turquie"],
      correct: "Italie"
    }
  ],
  'moyen': [
    {
      question: "Quel est le pays le plus grand en superficie ?",
      answers: ["États-Unis", "Canada", "Chine", "Russie"],
      correct: "Russie"
    },
    {
      question: "Quelle mer sépare l’Europe de l’Afrique ?",
      answers: ["Mer Noire", "Mer de Chine", "Mer Méditerranée", "Mer Rouge"],
      correct: "Mer Méditerranée"
    },
    {
      question: "Quelle est la capitale de l’Australie ?",
      answers: ["Sydney", "Melbourne", "Perth", "Canberra"],
      correct: "Canberra"
    },
    {
      question: "Dans quel pays se trouve le Kilimandjaro ?",
      answers: ["Kenya", "Tanzanie", "Afrique du Sud", "Égypte"],
      correct: "Tanzanie"
    },
    {
      question: "Quel pays a le plus de fuseaux horaires ?",
      answers: ["États-Unis", "France", "Russie", "Brésil"],
      correct: "France"
    },
    {
      question: "Quel fleuve traverse l’Égypte ?",
      answers: ["Tigre", "Nil", "Euphrate", "Sénégal"],
      correct: "Nil"
    },
    {
      question: "Quel pays a pour capitale 'Oslo' ?",
      answers: ["Suède", "Finlande", "Norvège", "Danemark"],
      correct: "Norvège"
    },
    {
      question: "Quel est le point culminant de l’Afrique ?",
      answers: ["Mont Kenya", "Mont Atlas", "Kilimandjaro", "Mont Cameroun"],
      correct: "Kilimandjaro"
    },
    {
      question: "La mer Morte est célèbre pour :",
      answers: ["Sa profondeur", "Son sel", "Ses vagues", "Ses requins"],
      correct: "Son sel"
    },
    {
      question: "Quel pays est composé de plus de 17 000 îles ?",
      answers: ["Philippines", "Indonésie", "Japon", "Malaisie"],
      correct: "Indonésie"
    }
  ],
  'difficile': [
    {
      question: "Quel est le lac le plus profond du monde ?",
      answers: ["Lac Tanganyika", "Lac Baïkal", "Lac Supérieur", "Lac Victoria"],
      correct: "Lac Baïkal"
    },
    {
      question: "Quel pays possède le plus de frontières terrestres avec d'autres pays ?",
      answers: ["Chine", "Russie", "Brésil", "Allemagne"],
      correct: "Chine"
    },
    {
      question: "Quel est le seul continent sans désert ?",
      answers: ["Afrique", "Europe", "Asie", "Océanie"],
      correct: "Europe"
    },
    {
      question: "Quel est le plus haut sommet d’Amérique du Sud ?",
      answers: ["Aconcagua", "Huascarán", "Chimborazo", "Illimani"],
      correct: "Aconcagua"
    },
    {
      question: "Quelle est la capitale de la Mongolie ?",
      answers: ["Almaty", "Tachkent", "Oulan-Bator", "Astana"],
      correct: "Oulan-Bator"
    },
    {
      question: "Quel pays a le plus grand nombre de volcans actifs ?",
      answers: ["Japon", "Indonésie", "Italie", "États-Unis"],
      correct: "Indonésie"
    },
    {
      question: "Quel détroit sépare l’Asie de l’Europe ?",
      answers: ["Détroit de Gibraltar", "Détroit d’Ormuz", "Détroit de Béring", "Détroit du Bosphore"],
      correct: "Détroit du Bosphore"
    },
    {
      question: "Quelle capitale est située la plus au nord du monde ?",
      answers: ["Stockholm", "Helsinki", "Reykjavik", "Oslo"],
      correct: "Reykjavik"
    },
    {
      question: "Dans quel pays se trouve le désert d’Atacama ?",
      answers: ["Pérou", "Bolivie", "Chili", "Argentine"],
      correct: "Chili"
    },
    {
      question: "Quel pays est traversé par l’équateur ET le méridien de Greenwich ?",
      answers: ["Brésil", "Gabon", "Indonésie", "Ouganda"],
      correct: "Gabon"
    }
  ]
},

    'religion-islamique': {
  'facile': [
    {
      question: "Quel est le nom du dernier prophète de l'islam ?",
      answers: ["Moussa", "Issa", "Mohammed", "Ibrahim"],
      correct: "Mohammed"
    },
    {
      question: "Combien de piliers compte l'islam ?",
      answers: ["3", "4", "5", "6"],
      correct: "5"
    },
    {
      question: "Quel est le livre sacré des musulmans ?",
      answers: ["La Torah", "La Bible", "Le Coran", "Les Psaumes"],
      correct: "Le Coran"
    },
    {
      question: "Quelle ville est la plus sacrée en islam ?",
      answers: ["Médine", "La Mecque", "Jérusalem", "Bagdad"],
      correct: "La Mecque"
    },
    {
      question: "Dans quelle direction les musulmans prient-ils ?",
      answers: ["Nord", "Sud", "Est", "Vers la Kaaba"],
      correct: "Vers la Kaaba"
    },
    {
      question: "Combien de prières obligatoires par jour pour un musulman ?",
      answers: ["3", "4", "5", "6"],
      correct: "5"
    },
    {
      question: "Quel mois est consacré au jeûne ?",
      answers: ["Rajab", "Dhou al-Hijja", "Ramadan", "Chawwâl"],
      correct: "Ramadan"
    },
    {
      question: "Quel est le premier pilier de l'islam ?",
      answers: ["La prière", "La zakat", "Le jeûne", "La shahada"],
      correct: "La shahada"
    },
    {
      question: "Quel est le nom du lieu de culte des musulmans ?",
      answers: ["Église", "Synagogue", "Mosquée", "Temple"],
      correct: "Mosquée"
    },
    {
      question: "Combien de sourates contient le Coran ?",
      answers: ["112", "113", "114", "115"],
      correct: "114"
    }
  ],
  'moyen': [
    {
      question: "Quelle est la première sourate du Coran ?",
      answers: ["Al-Baqara", "Al-Fatiha", "An-Nas", "Al-Ikhlas"],
      correct: "Al-Fatiha"
    },
    {
      question: "Quel ange a transmis la révélation au Prophète Mohammed ﷺ ?",
      answers: ["Israfil", "Mikaël", "Jibril", "Azraël"],
      correct: "Jibril"
    },
    {
      question: "Combien de fois les musulmans tournent-ils autour de la Kaaba lors du Hajj ?",
      answers: ["3", "5", "7", "9"],
      correct: "7"
    },
    {
      question: "Comment s'appelle le voyage nocturne du Prophète ?",
      answers: ["Hijra", "Isra et Mi'raj", "Hajj", "Umrah"],
      correct: "Isra et Mi'raj"
    },
    {
      question: "Quelle est la fête qui suit le Ramadan ?",
      answers: ["Aïd al-Adha", "Aïd al-Fitr", "Achoura", "Laylat al-Qadr"],
      correct: "Aïd al-Fitr"
    },
    {
      question: "Qui est la mère du Prophète Mohammed ﷺ ?",
      answers: ["Aïcha", "Fatima", "Amina bint Wahb", "Khadija"],
      correct: "Amina bint Wahb"
    },
    {
      question: "Combien de prophètes sont mentionnés dans le Coran ?",
      answers: ["10", "15", "25", "40"],
      correct: "25"
    },
    {
      question: "Quel est le nom de la grotte où le Prophète a reçu la première révélation ?",
      answers: ["Hira", "Thawr", "Uhud", "Badr"],
      correct: "Hira"
    },
    {
      question: "Quelle est la ville où est enterré le Prophète Mohammed ﷺ ?",
      answers: ["Mecque", "Taïf", "Jérusalem", "Médine"],
      correct: "Médine"
    },
    {
      question: "Comment s'appelle la prière du vendredi ?",
      answers: ["Maghrib", "Fajr", "Jumu'a", "Icha"],
      correct: "Jumu'a"
    }
  ],
  'difficile': [
    {
      question: "Quel calife a compilé le Coran en un seul livre ?",
      answers: ["Abu Bakr", "Umar ibn al-Khattab", "Uthman ibn Affan", "Ali ibn Abi Talib"],
      correct: "Uthman ibn Affan"
    },
    {
      question: "Quelle sourate commence sans la basmala ?",
      answers: ["Sourate 1", "Sourate 9", "Sourate 36", "Sourate 112"],
      correct: "Sourate 9"
    },
    {
      question: "Quel compagnon a été surnommé 'Le scribe du Prophète' ?",
      answers: ["Bilal", "Zayd ibn Thabit", "Abou Hurayra", "Omar"],
      correct: "Zayd ibn Thabit"
    },
    {
      question: "Combien de fois le mot 'Allah' apparaît dans le Coran ?",
      answers: ["Plus de 1000", "Moins de 500", "99", "114"],
      correct: "Plus de 1000"
    },
    {
      question: "Quelle est la plus longue sourate du Coran ?",
      answers: ["Al-Fatiha", "Al-Baqara", "An-Nisa", "Al-Imran"],
      correct: "Al-Baqara"
    },
    {
      question: "Qui fut le premier enfant à se convertir à l’islam ?",
      answers: ["Ali ibn Abi Talib", "Zayd ibn Harithah", "Abu Bakr", "Omar"],
      correct: "Ali ibn Abi Talib"
    },
    {
      question: "Combien de versets environ contient le Coran ?",
      answers: ["6236", "6000", "114", "10000"],
      correct: "6236"
    },
    {
      question: "Quel compagnon fut le premier muezzin ?",
      answers: ["Ali", "Omar", "Bilal", "Abou Bakr"],
      correct: "Bilal"
    },
    {
      question: "Quel événement historique a eu lieu en l'an 2 de l'hégire ?",
      answers: ["La révélation", "La bataille de Badr", "Isra et Mi'raj", "La conquête de La Mecque"],
      correct: "La bataille de Badr"
    },
    {
      question: "Quel nom porte la nuit considérée comme meilleure que 1000 mois ?",
      answers: ["Laylat al-Qadr", "Laylat al-Miraj", "Laylat al-Fitr", "Laylat al-Isra"],
      correct: "Laylat al-Qadr"
    }
  ]
}

  };

  loadQuestionsByCategoryAndDifficulty() {
    const categoryQuestions = this.questionData[this.category];
    if (categoryQuestions) {
      return categoryQuestions[this.difficulty] || [];
    }
    return [];
  }

  setupEventListeners() {
    this.checkAnswerBtn.addEventListener('click', () => this.checkAnswer());
    this.skipBtn.addEventListener('click', () => this.nextQuestion(true));
  }

  startQuiz() {
    if (this.questions.length === 0) {
      this.showToast('Aucune question disponible pour cette catégorie/difficulté.', 'warning');
      this.endQuiz(); // End quiz if no questions
      return;
    }
    this.currentQuestion = 0;
    this.score = 0;
    this.correctAnswers = 0;
    this.incorrectAnswers = 0;
    this.selectedAnswer = null;
    this.isAnswered = false;
    this.timeRemaining = 300; // Reset timer for new quiz
    this.startTime = new Date(); // Record quiz start time
    
    // Ensure the quiz card is visible and results are hidden
    this.quizCard.classList.remove('hidden');
    this.quizCard.classList.add('show');
    this.resultsContainer.classList.add('hidden');
    this.resultsContainer.classList.remove('show');

    this.updateProgress();
    this.showQuestion();
    this.startTimer();
    this.showToast('Quiz lancé ! Bonne chance !', 'info');
  }

  showQuestion() {
    if (this.currentQuestion >= this.totalQuestions) {
      this.endQuiz();
      return;
    }

    this.questionStartTime = new Date(); // Record question start time
    this.isAnswered = false;
    this.selectedAnswer = null;
    this.checkAnswerBtn.disabled = true; // Disable check button until an answer is selected
    this.answerButtonsElement.innerHTML = ''; // Clear previous answers

    const question = this.questions[this.currentQuestion];
    this.questionTextElement.textContent = question.question;

    question.answers.forEach((answer, index) => {
      const button = document.createElement('button');
      button.textContent = answer;
      button.classList.add('answer-button');
      button.dataset.answer = answer; // Store answer text
      button.addEventListener('click', () => this.selectAnswer(button));
      this.answerButtonsElement.appendChild(button);
    });

    this.updateProgress();
  }

  selectAnswer(selectedButton) {
    // Remove 'selected' class from all buttons
    Array.from(this.answerButtonsElement.children).forEach(button => {
      button.classList.remove('selected');
    });

    // Add 'selected' class to the clicked button
    selectedButton.classList.add('selected');
    this.selectedAnswer = selectedButton.dataset.answer;
    this.checkAnswerBtn.disabled = false; // Enable check button
  }

  checkAnswer() {
    if (this.isAnswered || !this.selectedAnswer) {
      this.showToast('Veuillez sélectionner une réponse.', 'warning');
      return;
    }

    this.isAnswered = true;
    const question = this.questions[this.currentQuestion];
    const allAnswerButtons = Array.from(this.answerButtonsElement.children);

    allAnswerButtons.forEach(button => {
      button.classList.add('disabled'); // Disable all buttons after answering
      if (button.dataset.answer === question.correct) {
        button.classList.add('correct');
      } else if (button.dataset.answer === this.selectedAnswer) {
        button.classList.add('incorrect');
      }
    });

    if (this.selectedAnswer === question.correct) {
      this.score += 10; // Example scoring
      this.correctAnswers++;
      this.showToast('Bonne réponse !', 'success');
    } else {
      this.incorrectAnswers++;
      this.showToast('Mauvaise réponse.', 'error');
    }

    this.updateStats();

    // Disable check and skip buttons after checking
    this.checkAnswerBtn.disabled = true;
    this.skipBtn.disabled = true;

    setTimeout(() => {
      this.nextQuestion();
      this.skipBtn.disabled = false; // Re-enable skip button for next question
    }, 1500); // Short delay before moving to next question
  }

  nextQuestion(skipped = false) {
    if (skipped && !this.isAnswered) { // Only count as skipped if not already answered
        this.incorrectAnswers++; // Count skipped as incorrect
        this.updateStats();
        this.showToast('Question passée !', 'info');
    }
    this.currentQuestion++;
    if (this.currentQuestion < this.totalQuestions) {
      this.showQuestion();
    } else {
      this.endQuiz();
    }
  }

  updateProgress() {
    this.currentQuestionNumberElement.textContent = this.currentQuestion + 1;
    this.totalQuestionsElement.textContent = this.totalQuestions;
    const progress = ((this.currentQuestion + 1) / this.totalQuestions) * 100;
    this.progressBarElement.style.width = `${progress}%`;
  }

  updateStats() {
    this.scoreElement.textContent = this.score;
    this.correctCountElement.textContent = this.correctAnswers;
    this.incorrectCountElement.textContent = this.incorrectAnswers;
  }

  startTimer() {
    if (this.timer) clearInterval(this.timer); // Clear any existing timer
    this.timer = setInterval(() => {
      this.timeRemaining--;
      const minutes = String(Math.floor(this.timeRemaining / 60)).padStart(2, '0');
      const seconds = String(this.timeRemaining % 60).padStart(2, '0');
      this.timeElement.textContent = `${minutes}:${seconds}`;

      if (this.timeRemaining <= 0) {
        clearInterval(this.timer);
        this.showToast('Temps écoulé !', 'error');
        this.endQuiz();
      }
    }, 1000);
  }

  endQuiz() {
    clearInterval(this.timer); // Stop the timer

    const endTime = new Date();
    const timeDiffSeconds = Math.floor((endTime - this.startTime) / 1000);
    const minutesTaken = String(Math.floor(timeDiffSeconds / 60)).padStart(2, '0');
    const secondsTaken = String(timeDiffSeconds % 60).padStart(2, '0');

    this.quizCard.classList.remove('show');
    this.quizCard.classList.add('hidden'); // Hide quiz card with animation
    
    setTimeout(() => {
      this.resultsContainer.classList.remove('hidden');
      this.resultsContainer.classList.add('show'); // Show results with animation

      this.finalScoreElement.textContent = this.score;
      this.finalCorrectElement.textContent = this.correctAnswers;
      this.finalIncorrectElement.textContent = this.incorrectAnswers;
      this.timeTakenElement.textContent = `${minutesTaken}:${secondsTaken}`;
      this.showToast('Quiz terminé ! Voir les résultats.', 'info');
    }, 300); // Match CSS transition duration
  }
}
