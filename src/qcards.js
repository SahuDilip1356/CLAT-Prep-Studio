import qcardsData from './data/gk_qcards_data.json';

export const getQCardKey = (card) => `${card.id}::${card.title}`;

export const qcards = qcardsData.map(card => ({
  ...card,
  cardKey: getQCardKey(card)
}));
