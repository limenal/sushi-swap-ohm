# SushiSwap Subgraph

This subgraph dynamically tracks swaps on SushiSwap and 

## Deployment

1. Run the `yarn build` command to build the subgraph, and check compilation errors before deploying.

2. Run `graph auth --product hosted-service <ACCESS_TOKEN>`

3. Deploy via `graph deploy --product hosted-service <GITHUB_USER>/<SUBGRAPH NAME>`. 

## Key Entity Overviews

#### Entity nesting
We use nesting of entities, since this allows us to bypass the limitation of the `first` command by 1000 elements and this allows us to get all the necessary data from the subgaph in one request.

#### PairYear, PairDay, PairHour, PairMinute

This entities tracks swaps and collect price and volume data.
