export interface Brand {
  id: string
  title: string
  showVersion: boolean
  greeting: string
  themeName: string
  bannerLabel: string
  mascot: string[]
  tagline: string
  tips: [string, string]
  whatsNew: string[]
}

const MASCOT = [' ▄███▄ ', '█ ▘ ▘ █', ' █████ ', ' ▀   ▀ ']

const PICPAY_WORDMARK = [
  '┌─┐ □ ┌─┐ ┌─┐ ┌─┐ ┬ ┬',
  '├─┘ │ │   ├─┘ ├─┤ └┬┘',
  '┴   ┴ └─┘ ┴   ┴ ┴  ┴ ',
]

const TAU: Brand = {
  id: 'tau',
  title: 'tau',
  showVersion: true,
  greeting: 'Welcome back',
  themeName: 'tau-cc',
  bannerLabel: 'tau',
  mascot: MASCOT,
  tagline: 'tau · inspect first · edit narrow · test · report',
  tips: ['Run tau doctor to check your setup', 'Press ? for shortcuts · / for commands'],
  whatsNew: ['Claude Code layout via tau ext cc', 'Switch themes with /theme tau-cc', '/help for more'],
}

const PICPAY: Brand = {
  id: 'picpay',
  title: 'PicPay Code',
  showVersion: false,
  greeting: 'Welcome back',
  themeName: 'picpay',
  bannerLabel: 'picpay',
  mascot: PICPAY_WORDMARK,
  tagline: 'picpay · inspect first · edit narrow · test · ship',
  tips: ['Run tau doctor to check your setup', 'Press ? for shortcuts · / for commands'],
  whatsNew: ['Work mode · PicPay Code', 'Switch themes with /theme picpay', '/help for more'],
}

const BRANDS: Record<string, Brand> = { tau: TAU, picpay: PICPAY }

export const DEFAULT_BRAND = TAU

export const resolveBrand = (): Brand => BRANDS[(process.env.TAU_BRAND ?? 'tau').toLowerCase()] ?? DEFAULT_BRAND
