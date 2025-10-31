import cron from 'cron'
import https from 'https'
import { logger } from './logger'
import { env } from './env'

const job = new cron.CronJob('*/14 * * * *', function () {
  https
    .get(env.API_URL, (res) => {
      if (res.statusCode === 200) {
        logger.info('Get request sent successfully')
      } else {
        logger.info('GET Request failed', res.statusCode)
      }
    })
    .on('error', (e) => {
      console.error('Error while sending request', e)
    })
})

export default job
