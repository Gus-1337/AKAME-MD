import { animeMaker } from '#anime';

export default animeMaker({
    command: ['molestar', 'bully'],
    api: 'bully',
    description: 'Molesta de broma a alguien o a ti mismo',
    soloPhrases: {
        global: ['se molesta a sí mismo/a', 'hace una cara de fastidio', 'se pone a hacer travesuras']
    },
    togetherPhrases: {
        global: ['molesta de broma a', 'le hace una travesura a', 'se burla de buena onda de']
    }
});
