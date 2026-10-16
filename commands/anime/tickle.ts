import { animeMaker } from '#anime';

export default animeMaker({
    command: ['cosquillas', 'tickle'],
    api: 'tickle',
    description: 'Hace cosquillas a alguien o a ti mismo',
    soloPhrases: {
        global: ['se ríe haciéndose cosquillas', 'se retuerce de la risa', 'no puede parar de reírse']
    },
    togetherPhrases: {
        global: ['le hace cosquillas a', 'le hace cosquillas sin piedad a', 'le hace cosquillas por sorpresa a']
    }
});
