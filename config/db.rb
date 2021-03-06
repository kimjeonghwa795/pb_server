# gem requires
require 'active_support/inflector' # see https://code.google.com/p/ruby-sequel/issues/detail?id=329
require 'sequel'
require 'logger'

Sequel::Model.raise_on_save_failure = true
options = {}
#options[:logger] = Logger.new(STDOUT) if SvegSettings.environment == :development
db_config = {
	:adapter => 'postgres',
	:default_schema => 'public',
	:user => PB::Secrets::POSTGRES_USER,
	:password => PB::Secrets::POSTGRES_PW,
	:host => SvegSettings.postgres_host,
	:database => "pookio_#{SvegSettings.environment}",
	:max_connections => 5
}
DB = Sequel.connect(db_config, options)
