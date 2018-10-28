// Cartesian product, https://stackoverflow.com/a/43053803 

const f = (a: any[], b: any[]): any[] =>
    Array.of().concat(...a.map(a2 => b.map(b2 => [].concat(a2, b2))));

export const cartesianProduct = (a: any[], b: any[], ...c: any[]): any[][] => {
  if (!b || b.length === 0) {
    return a;
  }
  const [b2, ...c2] = c;
  const fab = f(a, b);
  return cartesianProduct(fab, b2, ...c2);
};
