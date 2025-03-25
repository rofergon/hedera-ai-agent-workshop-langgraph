import { tool } from '@langchain/core/tools';
import { z } from 'zod';

const queryJokeDef = {
  name: 'QRY_JOKE',
  description: 'retrieves a random joke',
  schema: z.object({
    contains: z
      .string()
      .describe('something the joke should mention')
      .optional(),
    categories: z
      .enum(['Any', 'Programming', 'Miscellaneous', 'Dark', 'Pun', 'Spooky'])
      .array()
      .describe('categories for the joke')
      .optional(),
  }),
};

async function queryJokeImpl(inputs) {
  console.log('QRY_JOKE invoked with inputs:', inputs);
  const categories =
    (inputs.categories && inputs.categories.length > 0) ?
    inputs.join(',') :
    'Any';
  const contains =
    inputs.contains ?
    `contains=${inputs.contains}&` :
    '';
  const url = `https://v2.jokeapi.dev/joke/${categories}?${contains}format=json&blacklistFlags=nsfw,religious,political,racist,sexist,explicit`;
  console.log(url);
  const resp = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!resp.ok) {
    throw new Error(`HTTP error when invoking Joke API: ${resp.status}`);
  }
  const respJson = await resp.json();
  const { joke, setup, delivery } = respJson;
  let result;
  if (setup && delivery) {
    result = `${setup}\n\n${delivery}`;
  } else {
    result = joke;
  }
  return { joke: result };
}

const queryJokeTool = tool(queryJokeImpl, queryJokeDef);
const allJokeTools = [
  queryJokeTool,
];

export {
  queryJokeTool,
  allJokeTools,
};
