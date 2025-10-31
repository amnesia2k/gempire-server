import { EventEmitter } from 'events'

export const eventBus = new EventEmitter()

// Optional: Set max listeners to avoid memory leak warnings
eventBus.setMaxListeners(50)
