export interface PuzzleItem {
  id: string;
  name: string;
  diet: string;
  servings: number;
}

export interface PuzzleReceiver {
  id: string;
  name: string;
  capacity: number;
  volunteers: number | null;
  refrigeration: boolean;
  pickup_minutes: number;
  eligible_items: string[];
  diet?: string;
  latestPickup?: number;
}

interface Edge {
  to: number;
  remaining: number;
  reverse: Edge;
}

/** Max flow can move flexible items to other receivers to free up slots for restricted items. */
export function solveAllocation(
  items: PuzzleItem[], receivers: PuzzleReceiver[], cold: boolean, minutesLeft: number,
) {
  const sink = items.length + receivers.length + 1;
  const graph: Edge[][] = Array.from({ length: sink + 1 }, () => []);
  function connect(from: number, to: number, capacity: number) {
    const forward = { to, remaining: capacity } as Edge;
    const reverse: Edge = { to: from, remaining: 0, reverse: forward };
    forward.reverse = reverse;
    graph[from].push(forward);
    graph[to].push(reverse);
    return forward;
  }

  items.forEach((item, index) => connect(0, index + 1, item.servings));
  const routes = receivers.map((receiver, receiverIndex) => {
    const node = items.length + 1 + receiverIndex;
    const ready = (!cold || receiver.refrigeration)
      && receiver.pickup_minutes <= Math.min(minutesLeft, receiver.latestPickup ?? Infinity)
      && minutesLeft > 0;
    const capacity = Math.min(receiver.capacity, receiver.volunteers ?? receiver.capacity);
    connect(node, sink, ready ? capacity : 0);
    return items.map((item, itemIndex) => receiver.eligible_items.includes(item.id)
      && (!receiver.diet || item.diet === receiver.diet)
      ? connect(itemIndex + 1, node, item.servings) : null);
  });

  while (true) {
    const parent: (Edge | undefined)[] = [];
    const visited = new Set([0]);
    const queue = [0];
    for (let index = 0; index < queue.length && !visited.has(sink); index++) {
      for (const edge of graph[queue[index]]) {
        if (edge.remaining <= 0 || visited.has(edge.to)) continue;
        parent[edge.to] = edge;
        visited.add(edge.to);
        queue.push(edge.to);
      }
    }
    if (!visited.has(sink)) break;
    const path: Edge[] = [];
    for (let node = sink; node !== 0;) {
      const edge = parent[node]!;
      path.push(edge);
      node = edge.reverse.to;
    }
    const servings = Math.min(...path.map(edge => edge.remaining));
    for (const edge of path) {
      edge.remaining -= servings;
      edge.reverse.remaining += servings;
    }
  }

  const unallocated = items.map((item, index) => ({
    ...item, servings: item.servings - routes.reduce((sum, route) => sum + (route[index]?.reverse.remaining ?? 0), 0),
  })).filter(item => item.servings > 0);
  return {
    unallocated,
    allocations: receivers.map((receiver, index) => ({
      receiver,
      items: items.map((item, itemIndex) => ({
        ...item, servings: routes[index][itemIndex]?.reverse.remaining ?? 0,
      })).filter(item => item.servings > 0),
    })),
  };
}
