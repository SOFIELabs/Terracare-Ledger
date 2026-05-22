import logging
def pulse():
    logging.basicConfig(filename='../SOFIE_Core.log', level=logging.INFO)
    logging.info('Node Trinity_V Pulse')
if __name__ == '__main__':
    pulse()