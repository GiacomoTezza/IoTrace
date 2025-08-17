import click
from tracelet.modes import periodic, triggered, test

@click.group()
def cli():
    pass

@cli.command()
@click.option('--interval', default=3600, help='Interval in seconds')
def periodic_mode(interval):
    """Run tracelet in periodic mode"""
    periodic.run(interval)

@cli.command()
def triggered_mode():
    """Run tracelet in one-shot mode"""
    triggered.run()

@cli.command()
def test_mode():
    """Run tracelet in test mode"""
    test.run()

if __name__ == "__main__":
    print("""

████████╗██████╗  █████╗  ██████╗███████╗██╗     ███████╗████████╗
╚══██╔══╝██╔══██╗██╔══██╗██╔════╝██╔════╝██║     ██╔════╝╚══██╔══╝
   ██║   ██████╔╝███████║██║     █████╗  ██║     █████╗     ██║   
   ██║   ██╔══██╗██╔══██║██║     ██╔══╝  ██║     ██╔══╝     ██║   
   ██║   ██║  ██║██║  ██║╚██████╗███████╗███████╗███████╗   ██║   
   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚══════╝╚══════╝╚══════╝   ╚═╝   

Author: github.com/GiacomoTezza

    """
    )
    cli()
