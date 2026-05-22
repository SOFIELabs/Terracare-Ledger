import logging
def pulse():
    logging.basicConfig(filename='../SOFIE_Core.log', level=logging.INFO)
    logging.info('Node Monitor_A Pulse')
if __name__ == '__main__':
    pulse()