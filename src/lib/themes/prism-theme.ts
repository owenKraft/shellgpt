export const customTheme = {
  plain: {
    color: '#e4e4e7',
    backgroundColor: 'red'
  },
  styles: [
    {
      types: ['comment'],
      style: {
        color: '#6b7280',
        fontStyle: 'italic'
      }
    },
    {
      types: ['string', 'number', 'builtin', 'variable'],
      style: {
        color: '#22c55e'
      }
    },
    {
      types: ['class', 'function', 'keyword', 'selector'],
      style: {
        color: '#3b82f6'
      }
    }
  ]
}