import { animeMaker } from '#anime';

export default animeMaker({
    command: ['pegar', 'punch'],
    api: 'punch',
    description: 'Golpea a alguien o a ti mismo',
    soloPhrases: {
        global: ['lanza un puñetazo al aire', 'golpea con fuerza', 'se da un golpe', 'golpea la pared']
    },
    togetherPhrases: {
        global: ['le da un puñetazo a', 'golpea con fuerza a', 'le da un golpe a', 'lanza un golpe a']
    }
});
