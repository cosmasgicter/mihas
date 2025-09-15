export function cspPlugin(): {
  name: string;
  transformIndexHtml: {
    order: 'pre';
    handler: (html: string) => string;
  };
};