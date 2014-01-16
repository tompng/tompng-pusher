require 'json'
require 'digest/sha2'
require 'net/http'
module Pusher
  ENDPOINT = '<%= ENDPOINT_HOST %>:<%= ENDPOINT_PORT %>'
  class << self
    attr_writer :SECRET_KEY
    def SECRET_KEY
      @SECRET_KEY || ENV['PUSHER_SECRET_KEY'] || (@RAND_KEY||=rand)
    end

    def send data, arg
      version = Time.now.strftime '%s%L'
      query = {
        keys: model_versions(arg).map{|m, v|[group_id(m), v.to_s]}.to_json,
        data: data.to_json
      }
      Net::HTTP.new(*ENDPOINT.split(':')).post('/', URI.encode_www_form(query))
    end

    def listen arg
      model_versions(arg).map{|m, v|
        [Digest::SHA2.hexdigest(group_id(m)), v.to_s]
      }.to_json
    end

    private

    def group_id model
      name = model.class.name
      key = model.respond_to?(:id) ? model.id : model
      Digest::SHA2.hexdigest "#{self.SECRET_KEY}_#{name}_#{key}"
    end

    def model_versions arg
      if arg.is_a? Hash
        version = arg[:version]
        model = arg[:model]
        models = arg[:models]
      else
        model = arg
      end
      version ||= Time.now.strftime '%s%L'
      if models.is_a? Array
        models.map{|m|[m, version]}
      elsif models.is_a? Hash
        models
      else
        [[model, version]]
      end
    end

  end
end
