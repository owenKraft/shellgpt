import { PrismTheme } from 'prism-react-renderer'

export const customPrismTheme: PrismTheme = {
  plain: {
    color: '#e4e4e7',
    backgroundColor: 'hsl(0 0% 12%)'
  },
  styles: [
    {
      types: ['comment'],
      style: {
        color: '#6b7280',
        fontStyle: 'italic' as const
      }
    },
    {
      types: ['string', 'symbol'],
      style: {
        color: '#99f6e4'
      }
    },
    {
      types: ['number', 'boolean'],
      style: {
        color: '#fca5a5'
      }
    },
    {
      types: ['variable', 'function'],
      style: {
        color: '#93c5fd'
      }
    },
    {
      types: ['keyword', 'operator'],
      style: {
        color: '#f472b6'
      }
    }
  ]
} 