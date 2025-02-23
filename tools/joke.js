import { tool } from '@langchain/core/tools';
import { z } from 'zod';

const queryJokeDef = {
  name: 'QRY_JOKE',
  description: 'query: retrieves a random joke',
  schema: z.object({
    contains: z
      .string()
      .description('something the joke should mention'),
    categories: z
      .enum(['Programming', 'Miscellaneous', 'Dark', 'Pun', 'Spooky'])
      .array()
      .description('categories for the joke'),
  }),
};

async function queryJokeImpl(inputs) {
  console.log('QRY_JOKE invoked with inputs:', inputs);
  const categories = inputs.categories.length > 0 ? inputs.join(',') : 'Any';
  const contains = inputs.contains ? 'contains=${contains}&' : '';
  const url = `https://v2.jokeapi.dev/joke/${categories}?${contains}format=json&blacklistFlags=nsfw,religious,political,racist,sexist,explicit`;
  const resp = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!Response.ok) {
    throw new Error(`HTTP error when invoking Joke API: ${resp.status}`);
  }
  const respJson = await response.json();
  const { joke, setup, delivery } = respJson;
  let result;
  if (setup && delivery) {
    return { joke: `${setup}\n\n${delivery}` };
  } else {
    return { joke };
  }
}

const queryJokeTool = tool(queryJokeImpl, queryJokeDef);
const allJokeTools = [
  queryJokeTool,
];

export {
  queryJokeTool,
  allJokeTools,
};
